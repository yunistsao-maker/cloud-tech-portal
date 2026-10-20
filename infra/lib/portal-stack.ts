import { existsSync } from "node:fs";
import { join } from "node:path";
import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as triggers from "aws-cdk-lib/triggers";
import type { Construct } from "constructs";

const ROOT = join(__dirname, "..", "..");

export interface PortalStackProps extends StackProps {
  /** Bedrock model or inference-profile id used for summaries. */
  modelId: string;
  /** EventBridge rate expression body, e.g. "2 hours". */
  ingestRate: string;
  maxSummaries: number;
  /** Invoke the ingester once at deploy time so the site has data straight away. */
  runIngestOnDeploy: boolean;
  /** Folder with the static export; defaults to apps/web/out. Skipped when missing (e.g. in tests). */
  siteDir?: string;
}

/** IAM resources for one model id, covering cross-region inference profiles. */
export function bedrockResources(stack: Stack, modelId: string): string[] {
  const profile = /^(global|us|eu|apac|jp|au|ca|us-gov)\.(.+)$/.exec(modelId);
  if (!profile) return [`arn:${stack.partition}:bedrock:${stack.region}::foundation-model/${modelId}`];
  return [
    `arn:${stack.partition}:bedrock:${stack.region}:${stack.account}:inference-profile/${modelId}`,
    // A profile routes to the base model in whichever region serves the request.
    `arn:${stack.partition}:bedrock:*::foundation-model/${profile[2]}`,
  ];
}

export class PortalStack extends Stack {
  constructor(scope: Construct, id: string, props: PortalStackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, "Items", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: RemovalPolicy.RETAIN,
    });
    table.addGlobalSecondaryIndex({
      indexName: "byPublished",
      partitionKey: { name: "gsi1pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "gsi1sk", type: dynamodb.AttributeType.STRING },
    });

    const siteBucket = new s3.Bucket(this, "Site", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    const dataBucket = new s3.Bucket(this, "Data", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      lifecycleRules: [{ noncurrentVersionExpiration: Duration.days(30) }],
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // Next.js static export writes /compare/index.html; S3 behind OAC has no directory index.
    const rewrite = new cloudfront.Function(this, "IndexRewrite", {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(`function handler(event) {
  var r = event.request;
  if (r.uri.endsWith("/")) r.uri += "index.html";
  else if (!r.uri.split("/").pop().includes(".")) r.uri += "/index.html";
  return r;
}`),
    });

    const dataCache = new cloudfront.CachePolicy(this, "DataCache", {
      defaultTtl: Duration.minutes(5),
      minTtl: Duration.seconds(0),
      maxTtl: Duration.hours(1),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const distribution = new cloudfront.Distribution(this, "Cdn", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        functionAssociations: [{ function: rewrite, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }],
      },
      additionalBehaviors: {
        "data/*": {
          origin: origins.S3BucketOrigin.withOriginAccessControl(dataBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: dataCache,
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        },
      },
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 404, responsePagePath: "/404.html", ttl: Duration.minutes(1) },
        { httpStatus: 404, responseHttpStatus: 404, responsePagePath: "/404.html", ttl: Duration.minutes(1) },
      ],
    });

    const ingest = new NodejsFunction(this, "Ingest", {
      entry: join(ROOT, "services", "ingest", "src", "handler.ts"),
      projectRoot: ROOT,
      depsLockFilePath: join(ROOT, "package-lock.json"),
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 1024,
      timeout: Duration.minutes(10),
      // One run at a time: overlapping runs would summarise the same new items twice.
      reservedConcurrentExecutions: 1,
      environment: {
        TABLE_NAME: table.tableName,
        DATA_BUCKET: dataBucket.bucketName,
        MODEL_ID: props.modelId,
        MAX_SUMMARIES: String(props.maxSummaries),
        NODE_OPTIONS: "--enable-source-maps",
      },
      bundling: { format: OutputFormat.CJS, sourceMap: true, target: "node22", minify: true },
      logGroup: new logs.LogGroup(this, "IngestLogs", { retention: logs.RetentionDays.ONE_MONTH, removalPolicy: RemovalPolicy.DESTROY }),
    });
    table.grantReadWriteData(ingest);
    dataBucket.grantPut(ingest, "data/*");
    ingest.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: bedrockResources(this, props.modelId),
      }),
    );

    new events.Rule(this, "IngestSchedule", {
      schedule: events.Schedule.expression(`rate(${props.ingestRate})`),
      targets: [new targets.LambdaFunction(ingest, { retryAttempts: 0 })],
    });

    new cloudwatch.Alarm(this, "IngestErrors", {
      alarmDescription: "The feed ingester threw (S3/DynamoDB/config failure). Feed outages alone do not alarm.",
      metric: ingest.metricErrors({ period: Duration.hours(6) }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const siteDir = props.siteDir ?? join(ROOT, "apps", "web", "out");
    if (existsSync(siteDir)) {
      new s3deploy.BucketDeployment(this, "DeploySite", {
        sources: [s3deploy.Source.asset(siteDir, { exclude: ["data/**"] })],
        destinationBucket: siteBucket,
        // data/* is served from the data bucket; never let a site deploy touch it.
        exclude: ["data/*"],
        distribution,
        distributionPaths: ["/*"],
        memoryLimit: 512,
      });
    }

    if (props.runIngestOnDeploy) {
      new triggers.Trigger(this, "FirstIngest", {
        handler: ingest,
        executeAfter: [table, dataBucket],
        executeOnHandlerChange: false,
        timeout: Duration.minutes(10),
      });
    }

    new CfnOutput(this, "SiteUrl", { value: `https://${distribution.distributionDomainName}` });
    new CfnOutput(this, "TableName", { value: table.tableName });
    new CfnOutput(this, "DataBucketName", { value: dataBucket.bucketName });
    new CfnOutput(this, "IngestFunctionName", { value: ingest.functionName });
  }
}
