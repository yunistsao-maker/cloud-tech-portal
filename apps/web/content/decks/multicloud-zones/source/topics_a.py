from lib import *

# ---------------------------------------------------------------- 01
def d01():
    b = []
    b.append(T(40, 40, '信任等級（由低到高）', 'tl'))
    zs = [('z-mgmt', 'PRIVILEGED', 'Mgmt zone', '能改變其他 zone 的設定'),
          ('z-int', 'TRUSTED', 'Internal zone', '跑 workload，無 internet 直連'),
          ('z-dmz', 'SEMI-TRUSTED', 'DMZ / Perimeter', '唯一的對外入口與出口'),
          ('z-ext', 'UNTRUSTED', 'External zone', 'Internet、合作夥伴、SaaS')]
    for i, (z, tr, nm, ds) in enumerate(zs):
        y = 76 + i * 114
        b.append(node(76, y, 324, 96, [('tl tz', tr), ('tt', nm), ('ts', ds)], z=z, align='left', pad=20))
    b.append(A('M46 512 V84'))
    b.append(T(46, 66, '高', 'ts', 'middle'))
    b.append(T(46, 530, '低', 'ts', 'middle'))

    b.append(T(460, 40, '隔離層次（由外到內）', 'tl'))
    b.append(R(460, 76, 460, 442, 'nb', 16))
    b.append(T(484, 104, '帳號層', 'tt'))
    b.append(TC(552, 104, {'aws': 'AWS account', 'azure': 'Azure subscription', 'gcp': 'GCP project'}))
    b.append(T(484, 130, 'IAM、帳單、配額、guardrail 的硬邊界', 'ts'))
    b.append(R(484, 152, 412, 342, 'nk', 14))
    b.append(T(508, 180, '網路層', 'tt'))
    b.append(TC(576, 180, {'aws': 'VPC', 'azure': 'VNet', 'gcp': 'VPC / Shared VPC'}))
    b.append(T(508, 206, '路由、endpoint、檢查點', 'ts'))
    b.append(R(508, 228, 364, 242, 'nb', 12))
    b.append(T(532, 256, '資源層', 'tt'))
    b.append(TC(600, 256, {'aws': 'Subnet + Security Group', 'azure': 'Subnet + NSG / ASG', 'gcp': 'Subnet + firewall policy'}))
    b.append(T(532, 282, 'port、來源、身分', 'ts'))
    b.append(node(532, 308, 128, 64, [('tt-s', 'App tier'), ('tm', {'aws': 'SG: app', 'azure': 'ASG: app', 'gcp': 'tag: app'})], z='z-int'))
    b.append(node(744, 308, 104, 64, [('tt-s', 'Data tier'), ('tm', {'aws': 'SG: db', 'azure': 'ASG: db', 'gcp': 'tag: db'})], z='z-int'))
    b.append(A('M662 340 H740', 'int'))
    b.append(P(701, 340, '5432'))
    b.append(T(532, 406, '同一個 subnet 裡也能用規則互相隔離', 'ts'))
    b.append(T(532, 432, '越外層的邊界越硬，越內層越細', 'ts'))
    return svg(960, 550, b, '信任等級與隔離層次')

T01 = dict(
    num='01', slug='01-trust-model', title='信任模型與隔離層次', short='信任模型',
    lede='Zone 是信任邊界加上控制點的邏輯分類，不是一個 zone 對應一個 VPC。',
    zones=['ext', 'dmz', 'int', 'mgmt'], svg=d01,
    caption='左：四個 zone 的信任等級。右：雲上的三層隔離，切換雲平台可以看各雲的名稱。',
    services={
        'aws': [('AWS Organizations · OU', '用 OU 對應 zone 類別，掛不同 guardrail'),
                ('AWS account', 'zone 的硬邊界：IAM、帳單、配額'),
                ('Amazon VPC', '網路邊界：路由、endpoint、檢查點'),
                ('Security Group / NACL', '資源層：port 與來源的細粒度控制'),
                ('SCP / RCP', '限制帳號內 principal 與資源存取')],
        'azure': [('Management group', '對應 zone 類別，繼承 policy 與 RBAC'),
                  ('Subscription', 'zone 的硬邊界：RBAC、帳單、配額'),
                  ('Virtual Network', '網路邊界：路由、endpoint'),
                  ('NSG / ASG', '資源層：port 與來源，ASG 依角色分組'),
                  ('Azure Policy', 'deny / audit 規則，掛在 MG 上')],
        'gcp': [('Folder', '對應 zone 類別，繼承 IAM 與 Org Policy'),
                ('Project', 'zone 的硬邊界：IAM、帳單、配額'),
                ('VPC / Shared VPC', '網路邊界；Shared VPC 讓網路集中管理'),
                ('Firewall policy · tags', '資源層：hierarchical 與 network firewall policy'),
                ('Org Policy', '限制外部 IP、peering 等資源設定')],
    },
    summary=['Zone 是信任邊界加上控制點的邏輯分類，不等於一個 VPC。',
             '隔離從帳號層開始：帳號是 IAM、帳單、guardrail 的硬邊界。',
             '網路層管路由與檢查點，資源層用 SG / NSG 管 port 與來源。',
             '四個 zone 在每朵雲用同一套分類，各自用原生元件實作。'],
    deep_lede='地端用網段劃 zone，雲上要先用帳號劃，再用網路和資源規則補細節。',
    deep='''
<h2 id="why">為什麼不是一個 zone 一個 VPC</h2>
<p>地端的 zone 靠網段和防火牆劃出來，所以很自然會想到「一個 zone 開一個 VPC」。但在雲上，網路只是其中一層邊界。最硬的邊界是帳號：IAM、帳單、配額和 guardrail 都以帳號為單位。</p>
<p>所以雲上的 zone 是由帳號、網路、資源三層組合出來的邏輯分類。一個 zone 可以有很多帳號，一個帳號也可以有多個 VPC，兩者不是一對一。</p>
<h2 id="layers">三層隔離各自管什麼</h2>
<div class="tablewrap"><table class="wide"><thead><tr><th>層次</th><th>AWS</th><th>Azure</th><th>GCP</th><th>管什麼</th></tr></thead><tbody>
<tr><th>帳號層</th><td>Account（OU）</td><td>Subscription（MG）</td><td>Project（Folder）</td><td>IAM、帳單、配額、guardrail</td></tr>
<tr><th>網路層</th><td>VPC</td><td>VNet</td><td>VPC / Shared VPC</td><td>路由、endpoint、檢查點</td></tr>
<tr><th>資源層</th><td>Security Group、NACL</td><td>NSG、ASG</td><td>Firewall policy、tags</td><td>port、來源、身分</td></tr>
</tbody></table></div>
<h2 id="trust">四個 zone 的信任等級</h2>
<ul class="pts">
<li><b>External（Untrusted）：</b>不屬於你管理的範圍，包含 Internet 使用者、合作夥伴、SaaS、行動裝置。</li>
<li><b>DMZ（Semi-trusted）：</b>直接面對不受信任的流量，是所有對外流量的唯一入口與出口。</li>
<li><b>Internal（Trusted）：</b>跑 workload 的地方，沒有 internet 直連，對外一律經 DMZ。</li>
<li><b>Mgmt（Privileged）：</b>能改變其他 zone 的設定。這一區被攻破，等於全部被攻破。</li>
</ul>
<h2 id="identity">身分也是邊界</h2>
<p>雲上大部分的管理動作走 control plane API，不經過你的 VPC。拿到一組有權限的 credential，就能繞過所有網路控制。所以設計 zone 時一定要同時規劃 IAM：哪些角色能在哪個 zone 做什麼。</p>
<div class="callout"><b>設計原則</b><p>先寫一份與雲無關的 zone 規範，再分別對應到 AWS、Azure、GCP 的原生元件。分類一致，實作各自原生。</p></div>
''')

# ---------------------------------------------------------------- 02
def d02():
    b = []
    b.append(node(40, 30, 880, 84, [('tl tz', 'UNTRUSTED'), ('tt', 'External zone'), ('ts', 'Internet 使用者、合作夥伴、SaaS、行動裝置')], z='z-ext', align='left', pad=20))
    b.append(TC(900, 72, {'aws': 'CloudFront · AWS WAF · Shield', 'azure': 'Front Door · WAF · DDoS Protection', 'gcp': 'Cloud Armor · Global LB · Cloud CDN'}, 'tm', 'end'))
    b.append(R(40, 150, 600, 430, 'ct', 18))
    b.append(T(60, 176, '單一雲的 landing zone', 'tt-s'))
    b.append(TC(256, 176, {'aws': 'AWS Organization', 'azure': 'Azure tenant', 'gcp': 'GCP Organization'}))
    b.append(A('M460 114 V194', 'in'))
    b.append(P(460, 132, 'HTTPS 443 · 經 WAF'))
    b.append(node(64, 196, 552, 118, [('tl tz', 'SEMI-TRUSTED'), ('tt', 'DMZ / Perimeter hub'), ('ts', 'ingress、egress、inspection 集中在這裡'),
                                      ('tm', {'aws': 'Inspection VPC · Network Firewall · ALB · NAT GW', 'azure': 'Hub VNet / vWAN hub · Azure Firewall · App Gateway', 'gcp': 'Hub VPC · Cloud NGFW · Secure Web Proxy · Cloud NAT'})], z='z-dmz', align='left', pad=20))
    b.append(A('M184 314 V376', 'in'))
    b.append(P(184, 345, '指定 port · 經 NGFW'))
    b.append(node(64, 378, 240, 176, [('tl tz', 'TRUSTED'), ('tt', 'Internal zone'), ('ts', 'workload spokes'), ('ts', 'prod / non-prod 分段'),
                                      ('tm', {'aws': 'Workload accounts', 'azure': 'Spoke subscriptions', 'gcp': 'Service projects'}),
                                      ('tm', {'aws': 'VPC endpoints', 'azure': 'Private Endpoint', 'gcp': 'PSC endpoints'})], z='z-int', align='left', pad=20))
    b.append(node(376, 378, 240, 176, [('tl tz', 'PRIVILEGED'), ('tt', 'Mgmt zone'), ('ts', '管理存取、log、資安'), ('ts', 'CI/CD、監控'),
                                       ('tm', {'aws': 'Log Archive · Audit', 'azure': 'Management MG', 'gcp': 'Common folder'}),
                                       ('tm', {'aws': 'SSM Session Manager', 'azure': 'Azure Bastion', 'gcp': 'IAP'})], z='z-mgmt', align='left', pad=20))
    b.append(A('M374 466 H306', 'mg'))
    b.append(P(340, 466, '管理'))
    b.append(node(680, 196, 240, 150, [('tl tz', 'PEER'), ('tt', '其他雲'), ('ts', '相同 zone 結構'),
                                       ('tm', {'aws': 'Interconnect – multicloud', 'azure': 'colo / 對方雲服務', 'gcp': 'Cross-Cloud Interconnect'})], z='z-peer', align='left', pad=20))
    b.append(node(680, 378, 240, 176, [('tl tz', 'PEER'), ('tt', '地端資料中心'), ('ts', '既有 DC、分支、OT'),
                                       ('tm', {'aws': 'Direct Connect', 'azure': 'ExpressRoute', 'gcp': 'Cloud Interconnect'}),
                                       ('tm', {'aws': 'Site-to-Site VPN', 'azure': 'VPN Gateway', 'gcp': 'HA VPN'})], z='z-peer', align='left', pad=20))
    b.append(A('M644 271 H676', '', True, True))
    b.append(A('M644 466 H676', '', True, True))
    return svg(960, 600, b, '多雲 zone 參考架構')

T02 = dict(
    num='02', slug='02-reference-architecture', title='參考架構總覽', short='參考架構',
    lede='每朵雲各自一套相同結構的 landing zone，彼此之間與地端走私有互連。',
    zones=['ext', 'dmz', 'int', 'mgmt', 'peer'], svg=d02,
    caption='箭頭方向代表「由誰發起連線」。Mgmt 主動連進 Internal，反方向只允許 log 與 agent 回傳。',
    services={
        'aws': [('CloudFront + AWS WAF', 'External 邊緣：CDN、L7 防護'),
                ('Transit Gateway / Cloud WAN', 'Hub：連接所有 VPC 與地端'),
                ('AWS Network Firewall', 'DMZ 的集中檢查點'),
                ('VPC endpoints', 'Internal 私有存取 AWS 服務'),
                ('AWS Control Tower', 'Mgmt：Log Archive、Audit 帳號與基線'),
                ('Direct Connect / Interconnect', '與地端、其他雲的私有連線')],
        'azure': [('Front Door + WAF', 'External 邊緣：全球入口、L7 防護'),
                  ('Virtual WAN / hub VNet', 'Hub：連接所有 VNet 與地端'),
                  ('Azure Firewall', 'DMZ 的集中檢查點'),
                  ('Private Endpoint', 'Internal 私有存取 PaaS'),
                  ('Azure Landing Zone 平台 MG', 'Mgmt：Management、Identity'),
                  ('ExpressRoute', '與地端的私有連線')],
        'gcp': [('Cloud Armor + Global LB', 'External 邊緣：全球入口、L7 防護'),
                ('NCC / Shared VPC', 'Hub：集中網路與連線'),
                ('Cloud NGFW', 'DMZ 與 VPC 內的防火牆檢查'),
                ('Private Service Connect', 'Internal 私有存取 Google API 與服務'),
                ('Common folder', 'Mgmt：logging、security project'),
                ('Cloud / Cross-Cloud Interconnect', '與地端、其他雲的私有連線')],
    },
    summary=['每朵雲一套相同結構的 landing zone，雲之間走私有互連。',
             '所有對外流量只從 DMZ 進出，Internal 沒有 internet 直連。',
             'Mgmt 主動連進 Internal，反方向只允許 log 與 agent 回傳。',
             '地端和其他雲都是 peer，進來一樣要經過 hub 檢查。'],
    deep_lede='四個 zone 各自的定位與邊界，以及 External zone 的設計重點。',
    deep='''
<h2 id="overview">整體結構</h2>
<p>每朵雲各自建一套相同結構的 landing zone：DMZ 在 hub，Internal 和 Mgmt 是 spoke。雲之間、雲和地端之間走私有互連，進來的流量一樣要經過 hub 檢查。</p>
<h2 id="external">External zone</h2>
<p>不屬於你管理的範圍。設計重點是要在哪裡擋、用什麼擋。</p>
<ul class="pts">
<li><b>Edge 二選一。</b>用各雲原生 edge，或用第三方全球 edge（Cloudflare、Akamai）統一三朵雲的 WAF 與 DDoS 策略。多雲環境下，後者的 policy 一致性比較好。</li>
<li><b>全域流量導向。</b>用 DNS 層的 health check 做跨雲 failover，要注意 TTL 和 session 狀態能不能跟著切。</li>
<li><b>B2B 夥伴。</b>用 PrivateLink、Private Service Connect 暴露「服務」，避免用 site-to-site VPN 讓對方看到整個網段。做不到時，用 API Gateway 加 mTLS。</li>
<li><b>網域與憑證。</b>公開網域的 DNS 權威與公開憑證集中管理，不要三朵雲各自發證、各自管 zone file。</li>
</ul>
<div class="callout"><b>取捨</b><p>原生 edge 整合度高、成本低，但要維護三套規則。第三方 edge 一套規則管到底，但多一個供應商，也多一段路徑。</p></div>
<h2 id="dmz">DMZ</h2>
<p>所有對外流量的唯一入口與出口，負責 ingress、egress、inspection。細節見 <a href="../05-dmz-traffic/diagram.html">05 DMZ 流量路徑</a>。</p>
<h2 id="internal">Internal</h2>
<p>跑 workload 的 spoke，依 app × 環境切帳號，沒有 internet 直連，PaaS 一律走私有路徑。細節見 <a href="../06-internal-private-access/diagram.html">06 Internal 與 PaaS 私有化</a>。</p>
<h2 id="mgmt">Mgmt</h2>
<p>管理整個環境的特權區：log、資安工具、網路、共用服務。細節見 <a href="../07-mgmt-plane/diagram.html">07 Mgmt 管理面</a>。</p>
<h2 id="direction">連線方向</h2>
<ul class="pts">
<li>External 只能到 DMZ，不能直達 Internal 或 Mgmt。</li>
<li>Internal 對外一律經 DMZ 的 egress 路徑。</li>
<li>Mgmt 單向發起管理；Internal 到 Mgmt 只允許 log 與 agent 回傳。</li>
<li>地端與其他雲進來的流量，經 hub 檢查後才到指定服務。</li>
</ul>
<p>完整的 zone 對 zone 規則見 <a href="../08-traffic-matrix/diagram.html">08 Zone 流量矩陣</a>。</p>
''')

# ---------------------------------------------------------------- 03
def d03():
    b = []
    b.append(T(40, 40, 'ANTI-PATTERN', 'tl bad-t'))
    b.append(T(40, 66, '地端搬遷式', 'tt'))
    b.append(R(40, 96, 300, 330, 'ct', 16))
    b.append(T(60, 120, '單一帳號', 'tm'))
    for (x, y, z, nm) in [(66, 150, 'z-ext', 'External'), (210, 150, 'z-dmz', 'DMZ'), (66, 300, 'z-int', 'Internal'), (210, 300, 'z-mgmt', 'Mgmt')]:
        b.append(node(x, y, 104, 64, [('tt-s', nm), ('tm', 'VPC')], z=z))
    for d in ['M170 182 H210', 'M170 332 H210', 'M118 214 V300', 'M262 214 V300', 'M170 214 L210 300', 'M210 214 L170 300']:
        b.append(L(d, 'bad'))
    b.append(P(190, 257, 'peering × 6'))
    b.append(T(40, 456, '✕ 權限與 blast radius 沒分開', 'ts bad-t'))
    b.append(T(40, 482, '✕ Guardrail 無法分 zone 套用', 'ts bad-t'))
    b.append(T(40, 508, '✕ peering 不可遞移，無法集中檢查', 'ts bad-t'))

    b.append(T(380, 40, 'RECOMMENDED', 'tl ok-t'))
    b.append(T(380, 66, 'Zone 對應 OU，網路走 hub', 'tt'))
    b.append(R(380, 96, 540, 436, 'ct', 16))
    b.append(TC(400, 120, {'aws': 'AWS Organization', 'azure': 'Azure tenant root', 'gcp': 'GCP Organization'}))
    cols = [
        ('z-mgmt', {'aws': 'Security OU', 'azure': 'Management MG', 'gcp': 'common folder'}, 'Mgmt zone',
         [({'aws': 'Log Archive', 'azure': 'Management', 'gcp': 'Logging'}, {'aws': '集中 log', 'azure': 'Log Analytics', 'gcp': 'log sinks'}),
          ({'aws': 'Audit', 'azure': 'Identity', 'gcp': 'Security'}, {'aws': '資安工具', 'azure': 'AD DS、DNS', 'gcp': 'SCC、KMS'})],
         ('log 不可刪改', '停用稽核一律 deny')),
        ('z-dmz', {'aws': 'Infrastructure OU', 'azure': 'Connectivity MG', 'gcp': 'network folder'}, 'DMZ + Mgmt',
         [({'aws': 'Network', 'azure': 'Connectivity', 'gcp': 'Net hub'}, {'aws': 'TGW、DMZ VPC', 'azure': 'hub、Firewall', 'gcp': 'host project'}),
          ('Shared Svc', 'CI/CD、監控')],
         ('只准網路團隊', '改路由與防火牆')),
        ('z-int', {'aws': 'Workloads OU', 'azure': 'Landing zones MG', 'gcp': 'env folders'}, 'Internal zone',
         [({'aws': 'Prod', 'azure': 'Corp', 'gcp': 'Prod'}, {'aws': 'app accounts', 'azure': '內部 app', 'gcp': 'service projects'}),
          ({'aws': 'Non-prod', 'azure': 'Online', 'gcp': 'Non-prod'}, {'aws': 'dev、test', 'azure': '對外 app', 'gcp': 'service projects'})],
         ({'aws': '禁 IGW、公網 IP', 'azure': '禁公網 IP', 'gcp': '禁外部 IP'}, {'aws': '禁自建 peering', 'azure': '禁 public endpoint', 'gcp': '限制 VPC peering'})),
    ]
    for i, (z, ou, zl, accts, gr) in enumerate(cols):
        x = 396 + i * 173
        cx = x + 80.5
        g = [R(x, 136, 161, 274, 'nd', 12), TC(cx, 162, ou, 'tt-s', 'middle'), T(cx, 186, zl, 'ts tz', 'middle')]
        for j, (tt, st) in enumerate(accts):
            g.append(node(x + 12, 204 + j * 64, 137, 54, [('tt-s', tt), ('tm', st)], cls='nb'))
        g.append(T(cx, 346, 'GUARDRAIL', 'tl tz', 'middle'))
        g.append(TC(cx, 370, gr[0], 'ts', 'middle'))
        g.append(TC(cx, 392, gr[1], 'ts', 'middle'))
        b.append(f'<g class="{z}">' + ''.join(g) + '</g>')
    b.append(L('M649.5 410 V446'))
    b.append(L('M822.5 410 V446'))
    b.append(node(396, 446, 507, 66, [('tt-s', {'aws': 'Transit Gateway（RAM 共享）', 'azure': 'Virtual WAN hub / hub VNet', 'gcp': 'NCC hub + Shared VPC'}),
                                      ('ts', '所有 VPC 掛到 hub，route table 分 prod / non-prod / shared')], cls='nb'))
    return svg(960, 550, b, '帳號結構：錯誤做法與建議做法')

T03 = dict(
    num='03', slug='03-account-structure', title='帳號結構與 Guardrail', short='帳號結構',
    lede='先用帳號切 zone，再用 hub 接網路。順序和地端相反。',
    zones=['dmz', 'int', 'mgmt'], svg=d03,
    caption='左：把地端 zone 一對一搬上雲。右：zone 對應到 OU，每個 OU 有自己的 guardrail，網路統一接到 hub。',
    services={
        'aws': [('AWS Organizations', 'OU 階層，zone 類別的容器'),
                ('AWS Control Tower', '建立 landing zone 與基線 controls'),
                ('SCP', '限制帳號內 principal 能做什麼'),
                ('RCP', '限制誰能存取帳號內的資源'),
                ('AWS RAM', '把 TGW 或 subnet 共享給 workload 帳號'),
                ('IAM Identity Center', '每個 zone 的角色與 permission set')],
        'azure': [('Management groups', 'Platform 與 Landing zones 階層'),
                  ('Azure Policy', 'deny / audit / deployIfNotExists'),
                  ('Subscription vending', '用範本快速開出合規的訂閱'),
                  ('Entra PIM', '特權角色即時啟用與審核'),
                  ('Azure Virtual Network Manager', '集中管理連線與安全規則')],
        'gcp': [('Resource Manager · Folder', 'zone 類別的容器'),
                ('Org Policy', '限制外部 IP、peering 等設定'),
                ('Shared VPC', 'host project 集中網路，service project 部署'),
                ('IAM deny policies', '明確拒絕高風險權限'),
                ('Cloud Identity', '與企業 IdP federation')],
    },
    summary=['先用帳號切 zone，再接網路；順序和地端相反。',
             '一個 zone 可以有很多帳號，guardrail 掛在 OU / MG / Folder 上。',
             'Internal 類禁止公網出口與自建 peering；Mgmt 類保護 log 不被刪改。',
             '網路改由 hub 的 route table 分段，不用 VPC 之間網狀 peering。'],
    deep_lede='為什麼「每個 zone 一個 VPC 再全部 peering」行不通，以及正確的四層設計。',
    deep='''
<h2 id="anti">錯在哪裡</h2>
<p>地端搬遷式的做法是在一個帳號裡開 External、DMZ、Internal、Mgmt 四個 VPC，再全部互相 peering。問題有三個：</p>
<ul class="pts">
<li><b>權限和 blast radius 沒分開。</b>四個 zone 在同一個帳號，有 admin 權限的人可以改所有 zone 的 SG 和路由。DMZ 上被入侵的 IAM role 也可能動到 Internal。</li>
<li><b>Guardrail 沒辦法分 zone 套。</b>SCP 只能套在帳號或 OU 上，同一個帳號裡做不到「Internal 禁止 IGW，DMZ 允許」。</li>
<li><b>Peering 不能遞移。</b>網狀 peering 沒辦法讓流量集中經過一個 inspection 點。VPC 一多，連線數呈 N(N-1)/2 成長，路由管不動。</li>
</ul>
<p>Peering 本身沒有錯，Azure 的 hub-spoke 就是用 peering 做的。錯的是「同一個帳號 + 網狀 peering + 沒有 hub」這個組合。</p>
<h2 id="ou">帳號結構：zone 對應到 OU</h2>
<div class="tablewrap"><table class="wide"><thead><tr><th>Zone</th><th>AWS OU / 帳號</th><th>放什麼</th></tr></thead><tbody>
<tr><th>Mgmt</th><td>Security OU：Log Archive、Audit</td><td>集中 log、資安工具</td></tr>
<tr><th>DMZ</th><td>Infrastructure OU：Network 帳號</td><td>TGW、ingress / egress / inspection VPC</td></tr>
<tr><th>Mgmt</th><td>Infrastructure OU：Shared Services</td><td>AD、CI/CD runner、監控</td></tr>
<tr><th>Internal</th><td>Workloads OU 下分 Prod / Non-prod</td><td>每個 app × 環境一個帳號</td></tr>
<tr><th>External</th><td>不需要帳號</td><td>Edge 服務由 Firewall Manager 統一管</td></tr>
</tbody></table></div>
<h2 id="guardrail">Guardrail：每個 OU 掛不同政策</h2>
<ul class="pts">
<li><b>Workloads OU：</b>deny <code>ec2:CreateInternetGateway</code>、<code>ec2:AttachInternetGateway</code>、<code>ec2:CreateVpcPeeringConnection</code>，並禁止 subnet 自動配發 public IP。App 團隊沒辦法自己開對外通道。</li>
<li><b>Infrastructure OU：</b>TGW、route table、firewall policy 只有網路團隊的 role 能改。</li>
<li><b>Security OU：</b>deny <code>cloudtrail:StopLogging</code>、<code>cloudtrail:DeleteTrail</code>、刪除 log bucket 物件、關閉 GuardDuty 或 Config。</li>
</ul>
<h2 id="network">網路：hub-and-spoke</h2>
<ul class="pts">
<li>Network 帳號擁有 TGW，用 RAM 共享給各 workload 帳號，每個 VPC 都 attach 到 TGW。</li>
<li>Zone 之間的隔離改用 TGW route table：prod、non-prod、shared 分表，預設路由指向 inspection VPC。細節見 <a href="../04-hub-spoke-routing/diagram.html">04 Hub-and-spoke 路由分段</a>。</li>
<li>控管要求高的客戶可以用 VPC sharing：VPC 由 Network 帳號擁有，app 帳號只能在共享的 subnet 裡部署，改不了路由。</li>
</ul>
<h2 id="identity">身分：每個 zone 的角色分開</h2>
<ul class="pts">
<li>App 團隊：只有自己 workload 帳號的權限，動不了網路。</li>
<li>網路團隊：管 Network 帳號，其他帳號的網路設定唯讀。</li>
<li>資安團隊：所有帳號唯讀，Audit 帳號完整權限。</li>
<li>Break-glass 帳號獨立保管，使用時觸發告警。</li>
</ul>
<h2 id="other-clouds">Azure 與 GCP 的對應</h2>
<div class="tablewrap"><table class="wide"><thead><tr><th>用途</th><th>Azure Landing Zone</th><th>GCP</th></tr></thead><tbody>
<tr><th>Mgmt</th><td>Platform：Management、Identity</td><td>common folder：logging、security project</td></tr>
<tr><th>DMZ / hub</th><td>Platform：Connectivity（hub VNet 或 Virtual WAN）</td><td>network folder：每個環境一個 Shared VPC host project</td></tr>
<tr><th>Internal</th><td>Landing zones：Corp（內部）、Online（對外 app）</td><td>prod / non-prod folder 的 service project</td></tr>
<tr><th>Guardrail</th><td>Azure Policy：禁公網 IP、禁 PaaS public endpoint</td><td>Org Policy：<code>compute.vmExternalIpAccess</code>、<code>compute.restrictVpcPeering</code>、<code>compute.skipDefaultNetworkCreation</code></td></tr>
</tbody></table></div>
<p>客戶已經是錯誤架構時的轉移步驟，見 <a href="../12-migration-path/diagram.html">12 遷移路徑</a>。</p>
''')

# ---------------------------------------------------------------- 04
def d04():
    b = []
    b.append(R(360, 210, 240, 180, 'nb', 14))
    b.append(TC(480, 236, {'aws': 'Transit Gateway', 'azure': 'Virtual WAN hub', 'gcp': 'NCC hub'}, 'tt-s', 'middle'))
    b.append(T(480, 258, 'route domains', 'tm', 'middle'))
    for i, nm in enumerate(['prod', 'non-prod', 'shared']):
        y = 276 + i * 32
        b.append(R(390, y, 180, 26, 'nk', 6))
        b.append(T(480, y + 13, nm, 'tm', 'middle'))
    sp = {'aws': 'VPC', 'azure': 'VNet', 'gcp': 'VPC spoke'}
    for (y, nm, env) in [(70, 'Prod VPC A', 'prod'), (160, 'Prod VPC B', 'prod'), (372, 'Non-prod VPC A', 'non-prod'), (462, 'Non-prod VPC B', 'non-prod')]:
        b.append(node(60, y, 200, 68, [('tt-s', nm), ('tm', {c: f'{sp[c]} · {env}' for c in CLOUDS})], z='z-int'))
    b.append(node(700, 70, 220, 68, [('tt-s', 'Inspection VPC'), ('tm', {'aws': 'Network Firewall', 'azure': 'Azure Firewall', 'gcp': 'NVA + ILB next hop'})], z='z-dmz'))
    b.append(node(700, 160, 220, 68, [('tt-s', 'Egress VPC'), ('tm', {'aws': 'NAT GW → Internet', 'azure': 'Firewall → Internet', 'gcp': 'Cloud NAT → Internet'})], z='z-dmz'))
    b.append(node(700, 372, 220, 68, [('tt-s', 'Shared services'), ('tm', 'AD、CI/CD、監控')], z='z-mgmt'))
    b.append(node(700, 462, 220, 68, [('tt-s', '地端 DC'), ('tm', {'aws': 'DX Gateway', 'azure': 'ExpressRoute GW', 'gcp': 'Cloud Interconnect'})]))
    for d in ['M260 104 L360 236', 'M260 194 L360 262', 'M260 406 L360 338', 'M260 496 L360 364']:
        b.append(L(d, 'int'))
    b.append(L('M700 104 L600 236', 'out'))
    b.append(L('M700 194 L600 262', 'out'))
    b.append(L('M700 406 L600 338', 'mg'))
    b.append(L('M700 496 L600 364'))
    b.append(L('M160 228 V372', 'bad'))
    b.append(X(160, 300))
    b.append(B(128, 300, 3))
    b.append(T(180, 300, '不互通', 'ts bad-t'))
    b.append(B(650, 170, 1))
    b.append(B(650, 372, 2))
    for i, (h, l1, l2) in enumerate([('RT-PROD', 'propagate：shared、on-prem', '0.0.0.0/0 → inspection'),
                                     ('RT-NON-PROD', 'propagate：shared', '0.0.0.0/0 → inspection'),
                                     ('RT-SHARED', 'propagate：prod、non-prod', '以及 on-prem')]):
        x = 40 + i * 300
        b.append(T(x, 572, h, 'tl'))
        b.append(T(x, 596, l1, 'tm'))
        b.append(T(x, 618, l2, 'tm'))
    return svg(960, 640, b, 'Hub-and-spoke 與 route table 分段')

T04 = dict(
    num='04', slug='04-hub-spoke-routing', title='Hub-and-spoke 路由分段', short='路由分段',
    lede='Zone 之間的隔離由 hub 的 route table 決定，不靠 VPC 之間的 peering。',
    zones=['dmz', 'int', 'mgmt'], svg=d04,
    caption='① 所有 spoke 的預設路由指向 inspection。② prod 與 non-prod 都能到 shared services。③ prod 與 non-prod 彼此不 propagate。',
    services={
        'aws': [('Transit Gateway', 'route table、association、propagation'),
                ('AWS Cloud WAN', '用 policy 定義 segment，跨 region'),
                ('AWS RAM', '把 TGW 或 subnet 共享給其他帳號'),
                ('VPC sharing', 'Network 帳號擁有 VPC，app 帳號只部署'),
                ('TGW appliance mode', '讓 stateful 檢查的路由對稱'),
                ('Direct Connect Gateway', '地端線路接到 TGW')],
        'azure': [('Virtual WAN', 'secured hub、routing intent'),
                  ('Hub VNet + peering', '傳統 hub-spoke，自己管 UDR'),
                  ('User-defined routes', '0.0.0.0/0 指向 Azure Firewall'),
                  ('Azure Virtual Network Manager', '集中定義連線拓撲與安全規則'),
                  ('ExpressRoute Gateway', '地端線路接到 hub')],
        'gcp': [('Network Connectivity Center', 'VPC spoke 透過 hub 互通'),
                ('Shared VPC', '每個環境一個 host project'),
                ('Internal LB next hop', '把流量導到 NVA 做檢查'),
                ('VPC peering', 'hub-spoke 可用，但不可遞移'),
                ('Cloud Router', '動態路由與 BGP')],
    },
    summary=['Network 帳號擁有 hub，用 RAM 共享；spoke 只 attach 到 hub。',
             '① 所有 spoke 的預設路由指向 inspection VPC。',
             '② ③ 用 route table 分段：prod、non-prod 互不 propagate，都能到 shared。',
             'Stateful 防火牆跨 AZ 時要開 appliance mode，確保路由對稱。'],
    deep_lede='Association、propagation 怎麼組出 zone 分段，以及路由對稱、VPC sharing、成本的取捨。',
    deep='''
<h2 id="model">Association 與 propagation</h2>
<p>TGW 的每個 attachment 會 associate 到一張 route table，決定它的流量查哪張表；同時把自己的 CIDR propagate 到一張或多張表，決定誰找得到它。Zone 分段就是控制「誰 propagate 到哪張表」。</p>
<h2 id="tables">範例 route table</h2>
<div class="tablewrap"><table class="wide"><thead><tr><th>Route table</th><th>Associate</th><th>Propagate 進來</th><th>靜態路由</th></tr></thead><tbody>
<tr><th>RT-prod</th><td>prod VPC</td><td>shared、on-prem</td><td class="mono">0.0.0.0/0 → inspection</td></tr>
<tr><th>RT-non-prod</th><td>non-prod VPC</td><td>shared</td><td class="mono">0.0.0.0/0 → inspection</td></tr>
<tr><th>RT-shared</th><td>shared services VPC</td><td>prod、non-prod、on-prem</td><td>—</td></tr>
<tr><th>RT-inspection</th><td>inspection VPC</td><td>所有 spoke</td><td class="mono">0.0.0.0/0 → egress</td></tr>
</tbody></table></div>
<p>這張表讓 prod 到 shared 直接互通、不經檢查。若要求所有 east-west 都要檢查，就不做 propagate，spoke 的表只留 <code>0.0.0.0/0 → inspection</code>，由 firewall policy 決定放行哪些流量。</p>
<h2 id="symmetric">路由對稱</h2>
<p>Inspection VPC 跨多個 AZ 時，去程和回程可能被送到不同 AZ 的防火牆，stateful 檢查就會丟封包。TGW attachment 開啟 appliance mode，讓同一條連線固定走同一個 AZ。Azure 要讓去回都經過同一組 Azure Firewall 的 UDR；GCP 用 internal passthrough LB 當 next hop 時要開 symmetric hashing。</p>
<h2 id="vpc-sharing">各自擁有 VPC 還是 VPC sharing</h2>
<div class="tablewrap"><table class="wide"><thead><tr><th></th><th>App 帳號擁有 VPC</th><th>VPC sharing</th></tr></thead><tbody>
<tr><th>誰建 VPC</th><td>App 團隊（或 vending 範本）</td><td>網路團隊在 Network 帳號</td></tr>
<tr><th>App 能改路由嗎</th><td>可以，靠 SCP 擋危險動作</td><td>不行，只能在 subnet 裡部署</td></tr>
<tr><th>IP 使用</th><td>每個帳號一段，容易浪費</td><td>集中分配，比較省</td></tr>
<tr><th>適合</th><td>團隊自主性高的組織</td><td>控管要求高，例如金融業</td></tr>
</tbody></table></div>
<h2 id="cloudwan">Transit Gateway 還是 Cloud WAN</h2>
<p>TGW 是區域性的，跨 region 要做 TGW peering，路由自己管。Cloud WAN 用一份 policy 定義 segment，跨 region 自動處理，適合多 region、segment 多的企業。只有一兩個 region 時，TGW 就夠了。</p>
<h2 id="other">Azure 與 GCP</h2>
<ul class="pts">
<li><b>Azure：</b>hub VNet 加 peering 是最常見的做法，spoke 的 UDR 把 <code>0.0.0.0/0</code> 指向 Azure Firewall。Virtual WAN 的 routing intent 可以自動把 private 與 internet 流量送到 secured hub。</li>
<li><b>GCP：</b>每個環境一個 Shared VPC host project，跨環境用 NCC 的 VPC spoke 互通。用 VPC peering 做 hub-spoke 時要記得 peering 不可遞移，spoke 之間無法經 hub 轉送。</li>
</ul>
<h2 id="cost">成本注意</h2>
<ul class="pts">
<li>TGW 依 attachment 數和處理流量計費，所有流量都繞 inspection 會讓費用明顯增加。</li>
<li>跨 AZ 的資料傳輸也要算進去；inspection 盡量在每個 AZ 都有端點。</li>
<li>先決定哪些 east-west 流量真的需要檢查，再決定路由。</li>
</ul>
''')

# ---------------------------------------------------------------- 05
def d05():
    b = []
    for (x, w, z, lab) in [(40, 270, 'z-ext', 'EXTERNAL'), (320, 390, 'z-dmz', 'DMZ'), (720, 200, 'z-int', 'INTERNAL')]:
        b.append(f'<g class="{z}">' + R(x, 64, w, 366, 'band', 12) + T(x + 16, 86, lab, 'tl tz') + '</g>')
    b.append(node(52, 116, 90, 68, [('tt-s', '使用者'), ('tm', 'Internet')]))
    b.append(node(172, 116, 128, 68, [('tt-s', 'Edge + WAF'), ('tm', {'aws': 'CloudFront', 'azure': 'Front Door', 'gcp': 'Cloud Armor'})]))
    b.append(node(336, 116, 150, 68, [('tt-s', 'Ingress LB'), ('tm', {'aws': 'ALB', 'azure': 'App Gateway', 'gcp': 'External LB'})], z='z-dmz'))
    b.append(node(530, 116, 150, 294, [('tt-s', 'Inspection'), ('tm', {'aws': 'Network Firewall', 'azure': 'Azure Firewall', 'gcp': 'Cloud NGFW / NVA'}), ('ts', 'ingress 與'), ('ts', 'egress 共用')], z='z-dmz'))
    b.append(node(736, 116, 168, 68, [('tt-s', 'App'), ('tm', {'aws': 'Workload VPC', 'azure': 'Spoke VNet', 'gcp': 'Service project'})], z='z-int'))
    b.append(node(52, 342, 248, 68, [('tt-s', 'Internet'), ('tm', '只到 allowlist 目的地')]))
    b.append(node(336, 342, 150, 68, [('tt-s', 'NAT / Proxy'), ('tm', {'aws': 'NAT GW + FQDN', 'azure': 'Firewall FQDN', 'gcp': 'Secure Web Proxy'})], z='z-dmz'))
    b.append(node(736, 342, 168, 68, [('tt-s', 'App'), ('tm', '預設路由 → hub')], z='z-int'))
    for d in ['M142 150 H170', 'M300 150 H334', 'M486 150 H528', 'M680 150 H734']:
        b.append(A(d, 'in'))
    for d in ['M736 376 H682', 'M530 376 H488', 'M336 376 H302']:
        b.append(A(d, 'out'))
    for (x, y, n) in [(292, 116, 1), (478, 116, 2), (672, 116, 3), (896, 116, 4), (896, 342, 5), (672, 410, 6), (478, 342, 7)]:
        b.append(B(x, y, n))
    b.append(T(40, 462, 'INGRESS', 'tl in-t'))
    b.append(T(490, 462, 'EGRESS', 'tl out-t'))
    for i, s in enumerate(['① Edge 擋 DDoS 與 L7 攻擊', '② LB 終結 TLS，對外只開 443', '③ NGFW 檢查後才進 Internal', '④ App 只接受來自 LB 的流量']):
        b.append(T(40, 490 + i * 24, s, 'ts'))
    for i, s in enumerate(['⑤ Spoke 預設路由指向 hub', '⑥ NGFW 依來源 zone 與目的地檢查', '⑦ FQDN allowlist 後經 NAT 出去', '回應流量走同一條路，路由要對稱']):
        b.append(T(490, 490 + i * 24, s, 'ts'))
    return svg(960, 590, b, 'DMZ ingress 與 egress 流量路徑')

T05 = dict(
    num='05', slug='05-dmz-traffic', title='DMZ 流量路徑', short='DMZ 流量',
    lede='DMZ 做三件事：ingress、egress、inspection。所有對外流量只從這裡進出。',
    zones=['ext', 'dmz', 'int'], svg=d05,
    caption='藍色是 ingress（外部進來），橙色是 egress（內部出去）。Inspection 由兩條路徑共用。',
    services={
        'aws': [('CloudFront + AWS WAF + Shield', '邊緣防護：DDoS、L7 規則'),
                ('Application Load Balancer', 'Ingress VPC 的 TLS 終結'),
                ('AWS Network Firewall', '託管的 stateful 檢查、FQDN 過濾'),
                ('Gateway Load Balancer', '串接第三方 NGFW 的透明插入點'),
                ('NAT Gateway', 'Egress VPC 的出口'),
                ('AWS Firewall Manager', '跨帳號統一 WAF 與防火牆規則')],
        'azure': [('Front Door + WAF', '全球入口與 L7 防護'),
                  ('Application Gateway (WAF v2)', '區域入口的 TLS 終結與 WAF'),
                  ('Azure Firewall Premium', 'TLS inspection、IDPS、FQDN 規則'),
                  ('NAT Gateway', '固定的出站 IP'),
                  ('Azure Firewall Manager', '集中管理 firewall policy'),
                  ('DDoS Protection', 'L3/L4 防護')],
        'gcp': [('Cloud Armor', '邊緣 WAF 與 DDoS 防護'),
                ('External Application LB', '全球入口與 TLS 終結'),
                ('Cloud NGFW Enterprise', '分散式防火牆加 IPS'),
                ('Secure Web Proxy', '出站 FQDN / URL 過濾'),
                ('Cloud NAT', '託管的出站 NAT'),
                ('NVA + internal LB', '串接第三方 NGFW')],
    },
    summary=['DMZ 做三件事：ingress、egress、inspection。',
             'Ingress 經 edge、LB、NGFW 才進 Internal，只開指定 port。',
             'Egress 一律經 hub 檢查，FQDN allowlist 後才出 internet。',
             '常見折衷：egress 與 inspection 集中，ingress 分散但受管控。'],
    deep_lede='集中與分散 ingress、NGFW 選型、egress 控制與路由對稱的取捨。',
    deep='''
<h2 id="functions">三種功能</h2>
<div class="tablewrap"><table class="wide"><thead><tr><th>功能</th><th>做什麼</th><th>AWS</th><th>Azure</th><th>GCP</th></tr></thead><tbody>
<tr><th>Ingress</th><td>外部進來的流量入口</td><td>CloudFront、ALB</td><td>Front Door、App Gateway</td><td>Global LB、Cloud Armor</td></tr>
<tr><th>Egress</th><td>內部出去的流量出口</td><td>NAT GW、Network Firewall</td><td>Azure Firewall、NAT GW</td><td>Cloud NAT、Secure Web Proxy</td></tr>
<tr><th>Inspection</th><td>集中檢查與記錄</td><td>Network Firewall、GWLB</td><td>Azure Firewall</td><td>Cloud NGFW、NVA</td></tr>
</tbody></table></div>
<p>三種功能可以放在同一個 hub VPC，也可以拆成 ingress VPC、egress VPC、inspection VPC 三個。拆開的好處是權責與規則比較清楚。</p>
<h2 id="ingress">集中還是分散 ingress</h2>
<div class="tablewrap"><table class="wide"><thead><tr><th></th><th>集中式</th><th>分散式</th></tr></thead><tbody>
<tr><th>做法</th><td>所有對外服務經 ingress VPC 進來</td><td>每個 spoke 有自己的 LB 與 WAF</td></tr>
<tr><th>控制一致性</th><td>高，一個地方管</td><td>要靠 Firewall Manager / Azure Policy 強制</td></tr>
<tr><th>延遲與成本</th><td>多一跳，流量經 hub 計費</td><td>路徑短</td></tr>
<tr><th>團隊自主</th><td>低，上線要排網路團隊</td><td>高</td></tr>
</tbody></table></div>
<div class="callout"><b>常見折衷</b><p>Egress 與 inspection 集中，ingress 分散但受管控：WAF 規則由 platform team 統一發布，app 團隊只能選用。</p></div>
<h2 id="ngfw">NGFW 選型</h2>
<div class="tablewrap"><table class="wide"><thead><tr><th>選項</th><th>優點</th><th>限制</th></tr></thead><tbody>
<tr><th>各雲原生</th><td>託管、自動擴展、成本低</td><td>三套 rule 語法與功能差異</td></tr>
<tr><th>第三方同一家</th><td>三雲 rule 一致，沿用地端維運經驗</td><td>授權與維運成本高，HA 自己設計</td></tr>
</tbody></table></div>
<p>不少台灣金融客戶的內控要求內外層防火牆異質（不同廠牌）。這種情況常見的組合是外層用原生 firewall，內層用第三方 NGFW，或反過來。</p>
<h2 id="egress">Egress 控制</h2>
<ul class="pts">
<li>用 FQDN allowlist 管出站目的地，預設拒絕。</li>
<li>TLS inspection 的範圍要先和法遵、隱私單位確認，金融與醫療相關流量常需要排除。</li>
<li>給 SaaS、AI API 的出站例外要具體列出 FQDN，不要整個網域放行。</li>
</ul>
<h2 id="symmetry">路由對稱</h2>
<p>Stateful 防火牆要求去回走同一台。AWS 用 TGW appliance mode，Azure 用 UDR 設計，GCP 用 internal LB next hop 加 symmetric hashing。細節見 <a href="../04-hub-spoke-routing/deep-dive.html#symmetric">04 路由分段</a>。</p>
<h2 id="rules">DMZ 的使用規則</h2>
<ul class="pts">
<li>DMZ 裡不放持有敏感資料的 workload。</li>
<li>DMZ 到 Internal 只開指定 port，而且要經過檢查。</li>
<li>網路設備的管理介面不對外，只從 Mgmt zone 存取。</li>
</ul>
''')

# ---------------------------------------------------------------- 06
def d06():
    b = []
    b.append(R(40, 70, 250, 440, 'ct', 14))
    b.append(T(56, 94, 'Hub · Network 帳號', 'tt-s'))
    b.append(node(60, 120, 210, 80, [('tt-s', 'Private DNS zone'), ('tm', {'aws': 'Route 53 PHZ', 'azure': 'privatelink.* zone', 'gcp': 'Cloud DNS private'})], z='z-dmz'))
    b.append(node(60, 240, 210, 80, [('tt-s', 'DNS resolver'), ('tm', {'aws': 'Route 53 Resolver', 'azure': 'DNS Private Resolver', 'gcp': 'Cloud DNS'})], z='z-dmz'))
    b.append(node(60, 380, 210, 80, [('tt-s', {'aws': 'Transit Gateway', 'azure': 'hub VNet', 'gcp': 'NCC hub'}), ('tm', 'prod / non-prod 分表')], z='z-dmz'))
    b.append(L('M165 240 V202', 'dash'))
    b.append(f'<g class="z-int">{R(330, 70, 330, 210, "band", 14)}</g>')
    b.append(T(346, 94, 'Prod spoke', 'tt-s'))
    b.append(TC(452, 94, {'aws': 'workload account', 'azure': 'spoke subscription', 'gcp': 'service project'}))
    b.append(node(350, 126, 110, 74, [('tt-s', 'App'), ('tm', 'subnet: app')], z='z-int'))
    b.append(node(492, 126, 158, 74, [('tt-s', 'Endpoint'), ('tm', {'aws': 'Interface endpoint', 'azure': 'Private Endpoint', 'gcp': 'PSC endpoint'}), ('tm', '10.65.4.12')], z='z-int'))
    b.append(T(346, 240, 'PaaS 以私有 IP 出現在你的 VPC 裡', 'ts'))
    b.append(f'<g class="z-int">{R(330, 320, 330, 190, "band", 14)}</g>')
    b.append(T(346, 344, 'Non-prod spoke', 'tt-s'))
    b.append(node(350, 372, 110, 70, [('tt-s', 'App'), ('tm', 'subnet: app')], z='z-int'))
    b.append(node(492, 372, 158, 70, [('tt-s', 'Endpoint'), ('tm', {'aws': 'Interface endpoint', 'azure': 'Private Endpoint', 'gcp': 'PSC endpoint'})], z='z-int'))
    b.append(L('M560 280 V320', 'bad'))
    b.append(X(560, 300))
    b.append(T(580, 300, '路由隔離', 'ts bad-t'))
    b.append(R(700, 70, 220, 440, 'nk', 14))
    b.append(T(716, 94, 'Provider 網路', 'tt-s'))
    b.append(node(718, 126, 184, 100, [('tt-s', 'PaaS 服務'), ('tm', {'aws': 'S3 · RDS · Bedrock', 'azure': 'Storage · SQL DB', 'gcp': 'GCS · Cloud SQL'}), ('ts', '只接受指定 endpoint')]))
    b.append(node(718, 330, 184, 80, [('tt-s', 'Public endpoint'), ('ts', '已關閉')], cls='nb dash'))
    b.append(T(810, 486, 'Internet', 'tm', 'middle'))
    b.append(L('M810 472 V412', 'bad'))
    b.append(X(810, 442))
    b.append(A('M350 150 H274', 'mg dash'))
    b.append(A('M460 163 H490', 'in'))
    b.append(A('M650 163 H716', 'in'))
    b.append(L('M330 250 L272 400', 'int'))
    b.append(L('M330 440 L272 420', 'int'))
    b.append(B(311, 136, 1))
    b.append(B(475, 146, 2))
    b.append(B(683, 148, 3))
    b.append(B(894, 330, 4))
    b.append(T(40, 540, '① App 查 DNS，hub 的 private zone 回私有 IP', 'ts'))
    b.append(T(40, 566, '② 流量送到同 VPC 的 endpoint', 'ts'))
    b.append(T(500, 540, '③ 經私有路徑到 PaaS，不出 internet', 'ts'))
    b.append(T(500, 566, '④ PaaS 關閉 public access', 'ts'))
    return svg(960, 590, b, 'Internal spoke 與 PaaS 私有存取')

T06 = dict(
    num='06', slug='06-internal-private-access', title='Internal 與 PaaS 私有化', short='Internal',
    lede='Internal 沒有 internet 直連，存取 PaaS 一律走 private endpoint，DNS 集中在 hub。',
    zones=['int', 'dmz'], svg=d06,
    caption='PaaS 透過 endpoint 以私有 IP 出現在 spoke 裡，hub 的 private DNS zone 讓所有 spoke 解析到同一個私有 IP。',
    services={
        'aws': [('Interface VPC endpoints', 'PrivateLink 私有存取 AWS 服務'),
                ('Gateway endpoints', 'S3、DynamoDB 的免費私有路徑'),
                ('Route 53 Resolver + PHZ', '集中的私有 DNS'),
                ('VPC endpoint policy', '限定可存取的資源'),
                ('VPC Lattice', '跨 VPC、跨帳號的服務對服務連線'),
                ('TGW route tables', 'prod / non-prod 分段')],
        'azure': [('Private Endpoint', 'PaaS 以私有 IP 進到 VNet'),
                  ('Private DNS zones', 'privatelink.* 名稱解析'),
                  ('DNS Private Resolver', 'hub 的 inbound / outbound 解析'),
                  ('NSG / ASG', 'subnet 與角色層級規則'),
                  ('Azure Policy', 'deny public network access')],
        'gcp': [('Private Service Connect', '私有存取 Google API 與 producer 服務'),
                ('Private Google Access', '無外部 IP 的 VM 存取 Google API'),
                ('Cloud DNS private zones', '集中的私有 DNS'),
                ('Network firewall policies', 'VPC 內的規則'),
                ('Org Policy', '禁止外部 IP')],
    },
    summary=['Spoke 依 app × 環境切帳號；prod 與 non-prod 路由隔離。',
             'PaaS 一律走 private endpoint，並關閉 public access。',
             'Private DNS zone 集中在 hub，所有 spoke 解析到私有 IP。',
             '跨雲服務呼叫走應用層（API、PrivateLink 類），不追求三層全通。'],
    deep_lede='Spoke 切分、擋 public 的 policy、east-west 分段，以及 PaaS 私有化的完整步驟。',
    deep='''
<h2 id="spokes">Spoke 切分</h2>
<p>依 app × 環境（prod、non-prod）切 spoke account、subscription、project。帳號就是 blast radius 的邊界，也是成本歸屬的單位。</p>
<h2 id="public">用 policy 擋 public</h2>
<div class="tablewrap"><table class="wide"><thead><tr><th>雲</th><th>做法</th></tr></thead><tbody>
<tr><th>AWS</th><td>SCP deny <code>ec2:CreateInternetGateway</code>、<code>ec2:AttachInternetGateway</code>；禁止 subnet 自動配發 public IP</td></tr>
<tr><th>Azure</th><td>Azure Policy 禁止 NIC 掛 public IP、禁止 PaaS public network access</td></tr>
<tr><th>GCP</th><td>Org Policy <code>compute.vmExternalIpAccess</code>、<code>compute.skipDefaultNetworkCreation</code></td></tr>
</tbody></table></div>
<h2 id="eastwest">East-west 分段</h2>
<p>至少 prod 和 non-prod 要隔離。spoke 之間的流量是不是都要經過 inspection，成本差很多。</p>
<div class="callout"><b>取捨</b><p>分得越細，blast radius 越小，但路由表、firewall rule、endpoint 數量也一起增加。建議以「環境 × 資料等級」為主軸分段，不要每個 app 一個 segment。</p></div>
<h2 id="paas">PaaS 私有化的四個步驟</h2>
<ol class="steps">
<li>在 spoke 建立 endpoint（AWS interface endpoint、Azure Private Endpoint、GCP PSC endpoint）。</li>
<li>把 private DNS zone 放在 hub，關聯到所有 spoke，讓同一個服務名稱解析到私有 IP。</li>
<li>關閉 PaaS 的 public network access。</li>
<li>在 resource policy 限定來源 endpoint，例如 S3 bucket policy 的 <code>aws:SourceVpce</code>。</li>
</ol>
<h2 id="dns">多個 hub 的 DNS 衝突</h2>
<p>Azure 的 <code>privatelink.blob.core.windows.net</code> 這類 zone，同一個名稱在整個環境只能有一份權威。如果每個 region 或每個 hub 各建一份，記錄會互相蓋掉，解析結果取決於查詢從哪裡來。把 private zone 集中在一個 hub，其他 hub 用 forwarding 或 link 共用。</p>
<h2 id="cross-cloud">跨雲服務呼叫</h2>
<ul class="pts">
<li>優先用 API Gateway、PrivateLink 類服務或 service mesh 暴露「服務」，不要讓兩朵雲的網段三層全通。</li>
<li>跨雲流量進來一樣經過 hub 檢查。</li>
<li>跨雲 egress 費用與延遲要算進架構決策。</li>
</ul>
<h2 id="restricted">Restricted 子區</h2>
<p>敏感資料可以再切出 restricted 子區，例如 PCI DSS 的持卡人資料環境，有自己的帳號、segment 和更嚴格的 guardrail。見 <a href="../13-industry/diagram.html">13 產業補充</a>。</p>
''')

# ---------------------------------------------------------------- 07
def d07():
    b = []
    b.append(T(40, 44, '管理存取', 'tl'))
    b.append(node(40, 76, 150, 68, [('tt-s', '管理員'), ('tm', 'SSO + MFA')]))
    b.append(node(40, 186, 150, 68, [('tt-s', 'Break-glass'), ('ts', '使用即告警')], cls='nb dash'))
    b.append(node(240, 76, 160, 68, [('tt-s', 'IdP'), ('tm', {'aws': 'Identity Center', 'azure': 'Entra ID', 'gcp': 'Cloud Identity'})], z='z-mgmt'))
    b.append(node(450, 76, 210, 68, [('tt-s', 'Control plane API'), ('tm', '條件：來源 VPC / IP')]))
    b.append(node(450, 186, 210, 68, [('tt-s', 'Session 服務'), ('tm', {'aws': 'SSM Session Manager', 'azure': 'Azure Bastion', 'gcp': 'IAP TCP forwarding'})], z='z-mgmt'))
    b.append(node(710, 76, 210, 68, [('tt-s', '帳號與資源設定'), ('tm', 'IaC 經 pipeline 變更')]))
    b.append(node(710, 186, 210, 68, [('tt-s', 'Workloads'), ('tm', '不開 22 / 3389 對外')], z='z-int'))
    b.append(A('M190 110 H238', 'mg'))
    b.append(A('M400 110 H448', 'mg'))
    b.append(A('M400 134 L448 206', 'mg'))
    b.append(A('M660 110 H708', 'mg'))
    b.append(A('M660 220 H708', 'mg'))
    b.append(L('M40 296 H920', 'dash'))
    b.append(T(40, 326, '集中 LOG', 'tl'))
    for i, (nm, lg) in enumerate([('AWS 各帳號', 'CloudTrail · VPC Flow Logs'), ('Azure 各訂閱', 'Activity Log · flow logs'), ('GCP 各專案', 'Audit Logs · Flow Logs')]):
        b.append(node(40, 352 + i * 64, 250, 52, [('tt-s', nm), ('tm', lg)]))
    b.append(node(380, 380, 250, 132, [('tt-s', 'Log archive'), ('ts', '每朵雲一份，不可竄改'),
                                       ('tm', {'aws': 'S3 Object Lock', 'azure': 'Immutable Blob', 'gcp': 'GCS Bucket Lock'}),
                                       ('tm', {'aws': 'Log Archive 帳號', 'azure': 'Management 訂閱', 'gcp': 'logging project'})], z='z-mgmt'))
    b.append(node(690, 380, 230, 132, [('tt-s', 'SIEM'), ('ts', '跨雲單一視圖'), ('tm', '告警 · 調查 · 稽核')], z='z-mgmt'))
    for d in ['M290 378 L378 418', 'M290 442 H378', 'M290 506 L378 474']:
        b.append(A(d, 'mg'))
    b.append(A('M630 446 H688', 'mg'))
    return svg(960, 540, b, 'Mgmt：管理存取與集中 log')

T07 = dict(
    num='07', slug='07-mgmt-plane', title='Mgmt 管理面', short='Mgmt 管理面',
    lede='管理動作大多走 control plane API，Mgmt zone 有一半是身分設計。',
    zones=['mgmt', 'int'], svg=d07,
    caption='上：所有管理存取經 IdP，再分成 API 與 session 兩條路。下：三朵雲的 log 各自進不可竄改的 archive，再匯入同一個 SIEM。',
    services={
        'aws': [('IAM Identity Center', 'SSO、permission set、與企業 IdP 串接'),
                ('AWS Control Tower', 'Log Archive、Audit 帳號與基線'),
                ('CloudTrail organization trail', '所有帳號的 API 紀錄'),
                ('SSM Session Manager', '不開 SSH 也能進機器，全程記錄'),
                ('Security Hub · GuardDuty', '集中的資安發現與威脅偵測'),
                ('S3 Object Lock', 'log 不可刪改')],
        'azure': [('Entra ID + Conditional Access', '依裝置、位置、風險控管登入'),
                  ('Entra PIM', '特權角色即時啟用'),
                  ('Azure Bastion', '從瀏覽器或 CLI 連 VM，不開公網'),
                  ('Log Analytics workspace', '集中 log'),
                  ('Microsoft Sentinel', 'SIEM'),
                  ('Immutable Blob storage', 'log 不可刪改')],
        'gcp': [('Cloud Identity / Workforce Identity', '與企業 IdP federation'),
                ('IAP TCP forwarding', '不開外部 IP 也能 SSH / RDP'),
                ('Cloud Audit Logs + aggregated sinks', 'org 層集中 log'),
                ('Security Command Center', '集中的資安發現'),
                ('Bucket Lock', 'log 不可刪改')],
    },
    summary=['管理動作大多走 control plane API，Mgmt zone 有一半是身分設計。',
             '不開 SSH / RDP 對外，用 Session Manager、Bastion、IAP 進機器。',
             '三朵雲的 log 匯入同一個 SIEM，log archive 不可竄改。',
             'Mgmt 工具若集中在一朵雲，要評估跨雲單點故障。'],
    deep_lede='Mgmt zone 放什麼、管理存取怎麼設計、log 怎麼集中，以及跨雲依賴的取捨。',
    deep='''
<h2 id="accounts">獨立帳號群組</h2>
<div class="tablewrap"><table class="wide"><thead><tr><th>用途</th><th>AWS</th><th>Azure</th><th>GCP</th></tr></thead><tbody>
<tr><th>Log archive</th><td>Log Archive 帳號</td><td>Management 訂閱</td><td>logging project</td></tr>
<tr><th>資安工具</th><td>Audit / Security Tooling 帳號</td><td>Management 訂閱</td><td>security project</td></tr>
<tr><th>網路</th><td>Network 帳號</td><td>Connectivity 訂閱</td><td>network host project</td></tr>
<tr><th>共用服務</th><td>Shared Services 帳號</td><td>Identity 訂閱、共用訂閱</td><td>shared services project</td></tr>
</tbody></table></div>
<h2 id="access">管理存取</h2>
<ul class="pts">
<li>不開 SSH、RDP 到 internet。用 SSM Session Manager、Azure Bastion、IAP，或在 Mgmt zone 放 PAM jump host。</li>
<li>Session 全程記錄，存到 log archive。</li>
<li>資源設定一律經 IaC pipeline 變更，人員只有唯讀權限，緊急時才提權。</li>
</ul>
<h2 id="identity">一半是身分設計</h2>
<p>雲上大部分管理動作走 control plane API，不經過你的網路。要用身分條件來控制：</p>
<ul class="pts">
<li>AWS：policy 條件 <code>aws:SourceVpce</code>、<code>aws:SourceIp</code>、<code>aws:PrincipalOrgID</code>。</li>
<li>Azure：Conditional Access 依裝置、位置、風險控管；PIM 讓特權角色有時效。</li>
<li>GCP：Access Context Manager 定義 access level，搭配 VPC Service Controls。</li>
<li>Break-glass 帳號獨立保管、不走 IdP，使用時觸發告警並事後檢討。</li>
</ul>
<h2 id="direction">連線方向</h2>
<p>Mgmt 主動連進 Internal（patch、備份、CI/CD runner）。Internal 只允許 log 和 agent 回傳，不能主動連到 Mgmt 的管理介面。</p>
<h2 id="logs">Log 集中且不可竄改</h2>
<ul class="pts">
<li>每朵雲先在自己的 log archive 留一份，開啟 S3 Object Lock、Azure immutable storage 或 GCS Bucket Lock。</li>
<li>再匯入同一個 SIEM，做跨雲的告警與調查。</li>
<li>保留期限依法規與客戶內控設定；金融客戶通常要求較長。</li>
</ul>
<h2 id="dependency">跨雲依賴</h2>
<p>如果 AWS 上的 Terraform runner 同時管 Azure，AWS 的 Mgmt zone 一出事，就變成跨雲的單點故障。</p>
<div class="callout"><b>取捨</b><p>一個 Mgmt zone 管三朵雲：工具一致，但有跨雲依賴。每朵雲各一個：韌性高，但工具、權限、runbook 要同步三份。折衷做法是 SIEM 與 IdP 集中，執行面（runner、bastion）每朵雲各自一套。</p></div>
''')

TOPICS_A = [T01, T02, T03, T04, T05, T06, T07]
