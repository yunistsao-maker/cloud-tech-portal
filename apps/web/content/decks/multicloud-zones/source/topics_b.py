from lib import *

# ---------------------------------------------------------------- 08
VERDICT = {'A': ('v-allow', 'ALLOW'), 'L': ('v-limit', 'LIMITED'), 'I': ('v-inspect', 'INSPECT'), 'D': ('v-deny', 'DENY'), 'N': ('v-na', '—')}
MATRIX = [
    ('z-ext', 'UNTRUSTED', 'External', [('N', '', ''), ('A', '443', '經 WAF / LB'), ('D', '不可直達', ''), ('D', '管理面不對外', '')]),
    ('z-dmz', 'SEMI-TRUSTED', 'DMZ', [('I', '回應流量', 'egress proxy'), ('A', 'hub 內部', ''), ('I', '指定 port', '經 NGFW'), ('L', '僅 log、agent', '')]),
    ('z-int', 'TRUSTED', 'Internal', [('I', '經 DMZ egress', 'FQDN allowlist'), ('L', '僅 egress 路徑', ''), ('I', '同段 allow', '跨環境經檢查'), ('L', '僅 log、agent', '回傳')]),
    ('z-mgmt', 'PRIVILEGED', 'Mgmt', [('I', 'patch repo', '經 proxy'), ('A', '管理網路設備', ''), ('A', '單向發起管理', ''), ('A', '工具之間', '')]),
    ('z-peer', 'PEER', '其他雲 / 地端', [('N', '', ''), ('L', '經 hub 進入', ''), ('I', '指定服務', '經 hub 檢查'), ('L', '管理員經 PAM', '')]),
]

def d08():
    b = []
    b.append(T(40, 60, '發起端 ↓', 'tm'))
    b.append(T(40, 82, '目的端 →', 'tm'))
    cols = [('z-ext', 'External'), ('z-dmz', 'DMZ'), ('z-int', 'Internal'), ('z-mgmt', 'Mgmt')]
    for i, (z, nm) in enumerate(cols):
        x = 232 + i * 174
        b.append(f'<g class="{z}">' + R(x, 64, 168, 40, 'nd', 8) + T(x + 84, 84, nm, 'tt-s', 'middle') + '</g>')
    for r, (z, tr, nm, cells) in enumerate(MATRIX):
        y = 116 + r * 86
        b.append(node(40, y, 180, 80, [('tl tz', tr), ('tt-s', nm)], z=z, align='left', pad=16))
        for i, (v, l1, l2) in enumerate(cells):
            x = 232 + i * 174
            cls, lab = VERDICT[v]
            b.append(R(x, y, 168, 80, cls, 8))
            b.append(T(x + 14, y + 20, lab, f'tl {cls}-t'))
            if l1:
                b.append(T(x + 14, y + 46, l1, 'ts'))
            if l2:
                b.append(T(x + 14, y + 66, l2, 'ts'))
    legend = [('v-allow-t', 'ALLOW', '允許，仍受 SG / NSG 控制'), ('v-limit-t', 'LIMITED', '只開特定用途'),
              ('v-inspect-t', 'INSPECT', '必經 NGFW / proxy'), ('v-deny-t', 'DENY', '不允許')]
    xs = [40, 300, 500, 720]
    for (cls, lab, ds), x in zip(legend, xs):
        b.append(T(x, 580, lab, f'tl {cls}'))
        b.append(T(x + 8 + len(lab) * 7.5, 580, ds, 'ts'))
    return svg(960, 600, b, 'Zone 流量矩陣')

T08 = dict(
    num='08', slug='08-traffic-matrix', title='Zone 流量矩陣', short='流量矩陣',
    lede='先寫出 zone 對 zone 的規則，再設計網路。每一格都要對應到一個控制點。',
    zones=['ext', 'dmz', 'int', 'mgmt', 'peer'], svg=d08,
    caption='列是發起端，欄是目的端。這是參考基線，實際要依客戶的資安政策調整。',
    services={
        'aws': [('Security Group', 'Allow：資源層放行'),
                ('Network ACL', 'Deny：subnet 層明確拒絕'),
                ('TGW route tables', '決定 zone 之間是否可達'),
                ('Network Firewall policy', 'Inspect：檢查與 FQDN 規則'),
                ('Firewall Manager', '跨帳號一致的規則'),
                ('Network Access Analyzer', '驗證實際設定是否符合矩陣')],
        'azure': [('NSG / ASG', 'Allow 與 Deny 規則'),
                  ('Azure Firewall policy', 'Inspect：檢查與 FQDN 規則'),
                  ('User-defined routes', '決定流量是否經過 firewall'),
                  ('AVNM security admin rules', '由平台團隊強制、spoke 無法覆蓋'),
                  ('Network Watcher', 'IP flow verify、連線檢查')],
        'gcp': [('Hierarchical firewall policy', 'org / folder 層的強制規則'),
                ('Network firewall policy', 'VPC 層規則，搭配 secure tags'),
                ('Routes · ILB next hop', '決定流量是否經過檢查點'),
                ('Cloud NGFW', 'Inspect：IPS 與 FQDN'),
                ('Connectivity Tests', '驗證可達性')],
    },
    summary=['先寫出矩陣再設計網路：每一格都要對應到一個控制點。',
             'External 只能到 DMZ；Internal 對外一律經 DMZ。',
             'Mgmt 單向發起管理，其他 zone 到 Mgmt 只允許 log 與 agent。',
             '用 Network Access Analyzer、Connectivity Tests 定期驗證。'],
    deep_lede='四種判定在三朵雲各用什麼實作，以及怎麼依客戶調整與驗證。',
    deep='''
<h2 id="read">怎麼讀</h2>
<p>列是發起連線的 zone，欄是目的地的 zone。例如「Internal → External：Inspect」表示 Internal 主動往外連時，一定要經過 DMZ 的 NGFW 或 proxy。</p>
<p>這是參考基線。每個客戶的資安政策不同，先拿這張表和客戶逐格確認，再開始設計路由與規則。</p>
<h2 id="implement">四種判定怎麼實作</h2>
<div class="tablewrap"><table class="wide"><thead><tr><th>判定</th><th>意思</th><th>AWS</th><th>Azure</th><th>GCP</th></tr></thead><tbody>
<tr><th>Allow</th><td>放行，仍受資源層規則控制</td><td>SG</td><td>NSG / ASG</td><td>Firewall policy</td></tr>
<tr><th>Limited</th><td>只開特定 port 或特定 endpoint</td><td>SG + endpoint policy</td><td>NSG + Private Endpoint</td><td>Firewall rule + PSC</td></tr>
<tr><th>Inspect</th><td>路由必經檢查點</td><td>TGW RT → inspection</td><td>UDR → Azure Firewall</td><td>ILB next hop / Cloud NGFW</td></tr>
<tr><th>Deny</th><td>沒有路由，加上明確拒絕</td><td>無路由 + NACL + SCP</td><td>無路由 + NSG deny + Policy</td><td>無路由 + firewall deny + Org Policy</td></tr>
</tbody></table></div>
<h2 id="tailor">依客戶調整</h2>
<ul class="pts">
<li>金融客戶常要求 Internal 之間也全部經檢查，把「同段 allow」改成 Inspect。</li>
<li>有 OT 的製造業客戶要多一列、一欄：OT 只能和 IDMZ 互通。</li>
<li>PCI DSS 範圍內的 CDE 通常獨立成一列，只對特定服務開 Limited。</li>
</ul>
<h2 id="verify">定期驗證</h2>
<ul class="pts">
<li><b>AWS：</b>Network Access Analyzer 用規則描述「不應該存在的路徑」，定期掃描；Reachability Analyzer 檢查單一路徑。</li>
<li><b>Azure：</b>Network Watcher 的 IP flow verify 與 connection troubleshoot。</li>
<li><b>GCP：</b>Connectivity Tests 分析設定上的可達性。</li>
<li>把驗證放進 CI：網路設定變更後自動跑一次，結果對照這張矩陣。</li>
</ul>
''')

# ---------------------------------------------------------------- 09
def d09():
    b = []
    b.append(T(40, 44, '每個請求都要過三道檢查', 'tl'))
    b.append(node(40, 80, 120, 110, [('tt-s', '請求者'), ('ts', '人或服務'), ('tm', 'principal')]))
    gates = [('可信身分', '誰在存取？', {'aws': 'SCP', 'azure': 'Entra ID', 'gcp': 'Org Policy'}, {'aws': 'PrincipalOrgID', 'azure': 'Conditional Access', 'gcp': '限定網域成員'}),
             ('可信資源', '存取誰的資源？', {'aws': 'RCP', 'azure': 'Azure Policy', 'gcp': 'VPC-SC'}, {'aws': 'ResourceOrgID', 'azure': 'NSP 存取規則', 'gcp': 'perimeter 內資源'}),
             ('預期網路', '從哪裡來？', {'aws': 'endpoint policy', 'azure': 'Private Endpoint', 'gcp': 'VPC-SC'}, {'aws': 'SourceVpce', 'azure': '關閉 public access', 'gcp': 'access levels'})]
    for i, (t, q, c1, c2) in enumerate(gates):
        b.append(node(200 + i * 200, 80, 160, 110, [('tt-s', t), ('ts', q), ('tm', c1), ('tm', c2)], z='z-mgmt'))
    b.append(node(800, 80, 120, 110, [('tt-s', '資源'), ('ts', '資料、API'), ('tm', 'resource')]))
    for x in (160, 360, 560, 760):
        b.append(A(f'M{x} 135 H{x + 38}', 'in'))
    b.append(T(40, 236, 'SERVICE MODEL 放在哪裡', 'tl'))
    b.append(f'<g class="z-int">{R(40, 256, 420, 300, "band", 16)}</g>')
    b.append(T(60, 282, '你的 VPC · Internal', 'tt-s'))
    b.append(node(60, 304, 170, 80, [('tt-s', 'IaaS / 容器'), ('tm', {'aws': 'EC2 · EKS', 'azure': 'VM · AKS', 'gcp': 'GCE · GKE'})], z='z-int'))
    b.append(node(270, 304, 170, 80, [('tt-s', 'Private endpoint'), ('tm', {'aws': 'Interface endpoint', 'azure': 'Private Endpoint', 'gcp': 'PSC endpoint'})], z='z-int'))
    for i, s in enumerate(['IaaS：所在 subnet 決定 zone', 'PaaS：private endpoint + 關閉 public', 'Serverless：誰能呼叫、能連到哪', 'SaaS：視為 External']):
        b.append(T(60, 426 + i * 26, s, 'ts'))
    b.append(R(500, 256, 420, 300, 'nk', 16))
    b.append(T(520, 282, 'Provider 網路', 'tt-s'))
    b.append(node(520, 304, 180, 80, [('tt-s', 'PaaS'), ('tm', {'aws': 'S3 · RDS · Bedrock', 'azure': 'Storage · SQL DB', 'gcp': 'GCS · BigQuery'})]))
    b.append(node(720, 304, 180, 80, [('tt-s', 'Serverless'), ('tm', {'aws': 'Lambda', 'azure': 'Functions', 'gcp': 'Cloud Run'})]))
    b.append(node(520, 466, 380, 70, [('tt-s', 'SaaS（M365、Salesforce）'), ('tm', 'SSE / CASB · tenant restriction')], z='z-ext'))
    b.append(A('M440 344 H518', 'in'))
    b.append(A('M810 384 V420 H464', 'int dash'))
    b.append(P(632, 420, 'VPC 整合'))
    return svg(960, 576, b, 'Data perimeter 與 service model')

T09 = dict(
    num='09', slug='09-data-perimeter', title='Data perimeter 與 service model', short='Data perimeter',
    lede='PaaS、serverless、SaaS 預設不在你的 VPC 裡，zone 邊界要擴展成三道檢查。',
    zones=['int', 'ext', 'mgmt'], svg=d09,
    caption='上：每個請求都要過可信身分、可信資源、預期網路三道檢查。下：各 service model 預設的位置，以及把它們拉進 zone 的方法。',
    services={
        'aws': [('SCP', '限定 principal 只能存取組織內資源'),
                ('RCP', '限定只有組織內 principal 能存取資源'),
                ('VPC endpoint policy', '限定經這個 endpoint 能存取什麼'),
                ('Resource-based policy', 'S3 bucket policy 等，加 SourceVpce 條件'),
                ('IAM Access Analyzer', '找出對外部開放的資源'),
                ('Lambda VPC 整合', 'Serverless 進到 Internal')],
        'azure': [('Network Security Perimeter', 'PaaS 資源的邏輯邊界'),
                  ('Private Endpoint', 'PaaS 以私有 IP 進到 VNet'),
                  ('Azure Policy', 'deny public network access'),
                  ('Entra Conditional Access', '可信身分與裝置'),
                  ('Functions VNet integration', 'Serverless 進到 Internal'),
                  ('Defender for Cloud Apps', 'SaaS 的 CASB')],
        'gcp': [('VPC Service Controls', '最完整的原生 perimeter，防資料帶出'),
                ('Access Context Manager', '定義 access level'),
                ('Private Service Connect', '私有存取 Google API'),
                ('Org Policy', '限定網域成員、禁外部 IP'),
                ('Cloud Run Direct VPC egress', 'Serverless 進到 Internal')],
    },
    summary=['PaaS、serverless、SaaS 預設不在你的 VPC 裡，zone 邊界要擴展成 data perimeter。',
             '每個請求檢查三件事：可信身分、可信資源、預期網路。',
             'PaaS 走 private endpoint 並關閉 public；serverless 看誰能呼叫、能連到哪。',
             'SaaS 視為 External，用 SSE / CASB 與 tenant restriction 控管。'],
    deep_lede='三道檢查在各雲怎麼實作，以及 IaaS、PaaS、serverless、SaaS 各自的 zone 歸屬。',
    deep='''
<h2 id="why">為什麼需要 data perimeter</h2>
<p>網路邊界只管得到在你 VPC 裡的東西。PaaS、serverless、SaaS 預設走 public endpoint，任何拿到 credential 的人都可能從 internet 存取。所以 zone 的邊界要從「網路」擴展成「身分 + 資源 + 網路」三道檢查。</p>
<h2 id="three">三道檢查</h2>
<div class="tablewrap"><table class="wide"><thead><tr><th>檢查</th><th>問題</th><th>AWS</th><th>Azure</th><th>GCP</th></tr></thead><tbody>
<tr><th>可信身分</th><td>誰在存取？</td><td>SCP、<code>aws:PrincipalOrgID</code></td><td>Entra ID、Conditional Access</td><td>Org Policy 限定網域成員</td></tr>
<tr><th>可信資源</th><td>存取誰的資源？</td><td>RCP、<code>aws:ResourceOrgID</code></td><td>Azure Policy、NSP</td><td>VPC Service Controls</td></tr>
<tr><th>預期網路</th><td>從哪裡來？</td><td>endpoint policy、<code>aws:SourceVpce</code></td><td>Private Endpoint、關閉 public access</td><td>VPC-SC access levels</td></tr>
</tbody></table></div>
<h2 id="models">各 service model 的 zone 歸屬</h2>
<div class="tablewrap"><table class="wide"><thead><tr><th>Service model</th><th>預設位置</th><th>Zone 歸屬</th><th>控制手段</th></tr></thead><tbody>
<tr><th>IaaS / 容器</th><td>你的 VPC</td><td>所在 subnet、VPC 決定</td><td>SG / NSG、route table、禁 public IP</td></tr>
<tr><th>PaaS</th><td>Provider 的 public endpoint</td><td>看誰能存取、從哪裡存取</td><td>Private endpoint、關閉 public access、resource policy</td></tr>
<tr><th>Serverless</th><td>Provider 管理的網路</td><td>看誰能呼叫、能連到哪</td><td>VPC 整合、invoke 權限、egress 管控</td></tr>
<tr><th>SaaS</th><td>供應商環境</td><td>External</td><td>SSE / CASB、tenant restriction、egress allowlist</td></tr>
</tbody></table></div>
<h2 id="ai">AI 服務也是 PaaS</h2>
<p>生成式 AI 服務（例如 Amazon Bedrock、Vertex AI）和其他 PaaS 一樣處理：從 Internal 經 interface endpoint 或 PSC 存取，用 endpoint policy 與 IAM 限定能呼叫的資源，並把呼叫紀錄送進 log archive。</p>
<h2 id="saas">SaaS</h2>
<ul class="pts">
<li>SaaS 一律視為 External。</li>
<li>用 SSE / CASB 控管使用者存取，用 tenant restriction 避免員工登入非公司 tenant。</li>
<li>SaaS 與內部系統的資料交換經 DMZ 的整合層，不讓 SaaS 直接連 Internal。</li>
</ul>
''')

# ---------------------------------------------------------------- 10
def d10():
    b = []
    b.append(T(40, 28, 'IP 規劃（範例）', 'tl'))
    for x, s in [(40, '10.0.0.0'), (262, '10.64'), (317, '10.80'), (372, '10.96'), (427, '10.112')]:
        b.append(T(x, 52, s, 'tm'))
    b.append(T(920, 52, '10.255.255.255', 'tm', 'end'))
    segs = [(40, 220, 'seg-n', '地端 /10'), (260, 55, 'seg-c', 'AWS'), (315, 55, 'seg-c', 'Azure'), (370, 55, 'seg-c', 'GCP'), (425, 495, 'seg-r', '保留：併購、新雲、新 region')]
    for x, w, cls, lab in segs:
        b.append(R(x, 64, w, 48, cls, 4))
        b.append(T(x + w / 2, 88, lab, 'tt-s' if cls == 'seg-c' else 'ts', 'middle'))
    b.append(L('M260 112 L40 168', 'dash'))
    b.append(L('M315 112 L920 168', 'dash'))
    det = [(40, 55, 'z-dmz', 'DMZ', '/18'), (95, 55, 'z-mgmt', 'Mgmt', '/18'), (150, 110, None, '保留', '/17'),
           (260, 220, 'z-int', 'Internal prod', '10.65.0.0/16'), (480, 220, 'z-int', 'Internal non-prod', '10.66.0.0/16'), (700, 220, None, '保留', '10.67.0.0/16')]
    for x, w, z, nm, cidr in det:
        cls = 'nd' if z else 'seg-r'
        g = R(x, 168, w, 56, cls, 4) + T(x + w / 2, 187, nm, 'tt-s', 'middle') + T(x + w / 2, 207, cidr, 'tm', 'middle')
        b.append(f'<g class="{z}">{g}</g>' if z else g)
    b.append(T(40, 246, '放大：AWS 主要 region 10.64.0.0/14', 'tm'))
    b.append(T(40, 292, 'HYBRID DNS', 'tl'))
    b.append(node(40, 360, 180, 80, [('tt-s', '地端 DNS'), ('tm', 'corp.example.com')]))
    b.append(node(320, 316, 220, 64, [('tt-s', 'Inbound endpoint'), ('tm', {'aws': 'Route 53 Resolver', 'azure': 'DNS Private Resolver', 'gcp': 'inbound server policy'})], z='z-dmz'))
    b.append(node(320, 420, 220, 64, [('tt-s', 'Outbound endpoint'), ('tm', {'aws': 'forwarding rules', 'azure': 'forwarding ruleset', 'gcp': 'forwarding zone'})], z='z-dmz'))
    b.append(node(640, 316, 280, 64, [('tt-s', 'Private DNS zones（hub）'), ('tm', {'aws': 'Route 53 private hosted zone', 'azure': 'privatelink.* zones', 'gcp': 'Cloud DNS private zone'})], z='z-mgmt'))
    b.append(node(640, 420, 280, 64, [('tt-s', 'Spoke VPC'), ('tm', '使用預設 resolver')], z='z-int'))
    b.append(A('M220 384 L318 352', 'in'))
    b.append(A('M540 348 H638', 'in'))
    b.append(A('M780 420 V382', 'dash'))
    b.append(A('M640 452 H542', 'out'))
    b.append(A('M320 452 L222 418', 'out'))
    b.append(T(40, 520, '藍：地端查雲上私有名稱，地端 DNS 轉送到 inbound endpoint', 'ts'))
    b.append(T(40, 546, '橙：雲上查地端名稱，forwarding rule 經 outbound endpoint 轉回地端', 'ts'))
    b.append(T(40, 572, '多雲：同一個 private zone 名稱只建一份，避免多個 hub 互相蓋掉', 'ts'))
    return svg(960, 594, b, 'IP 規劃與 hybrid DNS')

T10 = dict(
    num='10', slug='10-ip-dns', title='IP 與 DNS 規劃', short='IP 與 DNS',
    lede='上線後最難改的兩件事。在建第一個 VPC 之前就要定好。',
    zones=['dmz', 'int', 'mgmt'], svg=d10,
    caption='上：CIDR 依「雲 × region × zone」切塊，每一層都留保留段。下：地端與雲之間的條件式轉送。',
    services={
        'aws': [('Amazon VPC IPAM', '跨帳號、跨 region 規劃與追蹤 CIDR'),
                ('Route 53 Resolver endpoints', 'inbound / outbound 混合解析'),
                ('Resolver rules', '條件式轉送到地端'),
                ('Route 53 private hosted zones', '私有名稱'),
                ('Route 53 Profiles', '把 DNS 設定共享給多個 VPC 與帳號')],
        'azure': [('AVNM IP address management', '集中規劃 VNet 位址空間'),
                  ('DNS Private Resolver', 'inbound / outbound endpoint'),
                  ('DNS forwarding ruleset', '條件式轉送'),
                  ('Private DNS zones', 'privatelink.* 與自訂名稱')],
        'gcp': [('Cloud DNS private zones', '私有名稱'),
                ('Forwarding zones', '轉送到地端 DNS'),
                ('Inbound server policy', '讓地端查詢 VPC 內名稱'),
                ('DNS peering', 'service project 共用 host 的 DNS')],
    },
    summary=['全企業一個 IPAM，CIDR 不重疊，CIDR 本身看得出雲、region、zone。',
             '每一層都留保留段，給併購、新雲、新 region。',
             '先決定權威 DNS 放哪裡，再用 inbound / outbound endpoint 串起來。',
             'Private DNS zone 每個名稱只建一份，集中在 hub 管理。'],
    deep_lede='IP 規劃範例、CIDR 重疊的處理方式，以及多雲 DNS 的設計步驟。',
    deep='''
<h2 id="ipam">IP 規劃原則</h2>
<ul class="pts">
<li>全企業的私有網段由單一 IPAM 管理，三朵雲和地端都在同一張表上。</li>
<li>依「雲 × region × zone」先切大塊，讓 CIDR 本身就看得出歸屬。</li>
<li>每一層都留保留段。</li>
</ul>
<div class="tablewrap"><table class="wide"><thead><tr><th>範圍</th><th>CIDR</th><th>用途</th></tr></thead><tbody>
<tr><td>企業總池</td><td class="mono">10.0.0.0/8</td><td>所有私有網段</td></tr>
<tr><td>地端</td><td class="mono">10.0.0.0/10</td><td>既有資料中心、分支</td></tr>
<tr><td>AWS</td><td class="mono">10.64.0.0/12</td><td>每個 region 一個 /14</td></tr>
<tr><td>　主要 region</td><td class="mono">10.64.0.0/14</td><td>以下為 zone 切分</td></tr>
<tr><td>　DMZ / hub</td><td class="mono">10.64.0.0/18</td><td>ingress、egress、inspection</td></tr>
<tr><td>　Mgmt</td><td class="mono">10.64.64.0/18</td><td>shared services、工具</td></tr>
<tr><td>　Internal prod</td><td class="mono">10.65.0.0/16</td><td>再切 /20–/22 給各 spoke</td></tr>
<tr><td>　Internal non-prod</td><td class="mono">10.66.0.0/16</td><td>與 prod 路由隔離</td></tr>
<tr><td>　保留</td><td class="mono">10.64.128.0/17、10.67.0.0/16</td><td>成長空間</td></tr>
<tr><td>Azure</td><td class="mono">10.80.0.0/12</td><td>同上結構</td></tr>
<tr><td>Google Cloud</td><td class="mono">10.96.0.0/12</td><td>同上結構</td></tr>
<tr><td>保留</td><td class="mono">10.112.0.0 – 10.255.255.255</td><td>併購、新雲、新 region</td></tr>
</tbody></table></div>
<p>數字是範例，依實際規模調整。</p>
<h2 id="overlap">CIDR 重疊怎麼辦</h2>
<ul class="pts">
<li><b>只暴露服務：</b>用 PrivateLink、Private Service Connect，對方只看到 endpoint，不需要路由互通。</li>
<li><b>NAT：</b>AWS 的 private NAT gateway 可以把重疊網段轉成可路由的位址。</li>
<li><b>長期：</b>重新編址。併購整合時排進計畫，不要一直靠 NAT 撐。</li>
</ul>
<h2 id="dns-steps">DNS 設計步驟</h2>
<ol class="steps">
<li>決定權威 DNS 放哪裡：多數企業以地端 DNS 為中樞。</li>
<li>規劃名稱空間，例如 <code>corp.example.com</code> 在地端，<code>aws.corp.example.com</code>、<code>azure.corp.example.com</code> 各自委派。</li>
<li>每朵雲在 hub 建 inbound 與 outbound endpoint。</li>
<li>設定條件式轉送：地端查雲上名稱轉到 inbound，雲上查地端名稱經 outbound 轉回。</li>
<li>Private endpoint 用的 private zone 集中在 hub，關聯到所有 spoke。</li>
</ol>
<h2 id="multicloud-dns">多雲 DNS 的常見衝突</h2>
<ul class="pts">
<li>同一個 <code>privatelink.*</code> zone 在多個 hub 各建一份，記錄互相蓋掉。</li>
<li>兩朵雲都想當某個網域的權威，查詢結果取決於從哪裡查。</li>
<li>條件式轉送形成迴圈：A 轉給 B，B 又轉回 A。</li>
</ul>
<h2 id="tools">工具</h2>
<p>AWS 有 VPC IPAM，Azure 有 Virtual Network Manager 的 IP 位址管理。要同時管三朵雲和地端，多數企業會用第三方 DDI / IPAM 工具當單一真相來源。</p>
''')

# ---------------------------------------------------------------- 11
def d11():
    b = []
    cols = [('A · 經地端 hub', '既有線路接回 DC 再轉', 'Azure', [('tt-s', '地端 DC'), ('tm', 'DX · ExpressRoute')], 'Direct Connect + ExpressRoute',
             ['✓ 重用既有線路與防火牆', '✕ 延遲高，地端成瓶頸', '→ 跨雲流量少、DC 仍是主力']),
            ('B · Colo cloud router', 'colo 裡的虛擬 router 接多雲', 'Azure', [('tt-s', 'Cloud router'), ('tm', 'Equinix · Megaport')], 'virtual cross-connect',
             ['✓ 低延遲、頻寬彈性', '✕ 多一個供應商，HA 自己做', '→ 跨雲流量中等以上']),
            ('C · 雲對雲直連', '雲端業者託管的互連', 'GCP', [('tt-s', '託管互連'), ('tm', 'AWS Interconnect'), ('tm', 'multicloud')], 'GCP 另有 Cross-Cloud Interconnect',
             ['✓ 託管，不用處理實體線路', '✕ 支援的 region 有限', '→ 主要 region 有支援、流量大'])]
    for i, (h, sub, other, mid, note, pts) in enumerate(cols):
        x0 = 40 + i * 300
        b.append(T(x0, 50, h, 'tt'))
        b.append(T(x0, 76, sub, 'ts'))
        b.append(R(x0, 100, 280, 300, 'nk', 14))
        b.append(node(x0 + 20, 136, 110, 56, [('tt-s', 'AWS')]))
        b.append(node(x0 + 150, 136, 110, 56, [('tt-s', other)]))
        b.append(node(x0 + 50, 276, 180, 72, mid))
        b.append(L(f'M{x0 + 75} 192 L{x0 + 110} 274'))
        b.append(L(f'M{x0 + 205} 192 L{x0 + 170} 274'))
        b.append(T(x0 + 140, 376, note, 'tm', 'middle'))
        cls = ['ts ok-t', 'ts bad-t', 'ts']
        for j, s in enumerate(pts):
            b.append(T(x0, 432 + j * 26, s, cls[j]))
    b.append(R(40, 520, 880, 80, 'nb', 12))
    b.append(T(60, 544, 'AWS INTERCONNECT – MULTICLOUD（截至 2026-10）', 'tl'))
    b.append(T(60, 576, '2026-04  GA，首家合作雲 Google Cloud', 'tm'))
    b.append(T(380, 576, '2026-07  OCI GA（us-east-1）', 'tm'))
    b.append(T(660, 576, 'Azure  官方表示 2026 年稍晚', 'tm'))
    return svg(960, 620, b, '跨雲互連的三種做法')

T11 = dict(
    num='11', slug='11-interconnect', title='跨雲互連', short='跨雲互連',
    lede='三種做法：經地端、colo cloud router、雲對雲直連。依跨雲流量與 region 支援選擇。',
    zones=['peer'], svg=d11,
    caption='三種拓撲的差別在中間那個節點是誰在管：自己的資料中心、colo 裡的虛擬 router，或雲端業者。',
    services={
        'aws': [('AWS Direct Connect', '地端到 AWS 的專線'),
                ('Direct Connect Gateway', '一條線接多個 region 的 TGW'),
                ('AWS Interconnect – multicloud', '託管的雲對雲私有互連'),
                ('Site-to-Site VPN', '備援或小流量'),
                ('Transit Gateway / Cloud WAN', '互連的 AWS 端接點')],
        'azure': [('ExpressRoute', '地端到 Azure 的專線'),
                  ('ExpressRoute Global Reach', '經 Microsoft 骨幹串接地端站點'),
                  ('VPN Gateway', '備援或小流量'),
                  ('Virtual WAN', '互連的 Azure 端接點')],
        'gcp': [('Dedicated / Partner Interconnect', '地端到 GCP 的專線'),
                ('Cross-Cloud Interconnect', 'GCP 到其他雲的專線'),
                ('HA VPN', '備援或小流量'),
                ('Cloud Router · NCC', '動態路由與集中連線')],
    },
    summary=['三種做法：經地端、colo cloud router、雲對雲直連。',
             '跨雲流量少、地端仍是主 DC：經地端最省事。',
             '跨雲流量中等以上且要彈性：colo cloud router。',
             '雲對雲直連是託管服務，但要先確認主要 region 有沒有支援。'],
    deep_lede='三種做法的比較、AWS Interconnect – multicloud 目前狀態，以及備援、加密、路由的設計重點。',
    deep='''
<h2 id="options">三種做法比較</h2>
<div class="tablewrap"><table class="wide"><thead><tr><th></th><th>A · 經地端</th><th>B · Colo cloud router</th><th>C · 雲對雲直連</th></tr></thead><tbody>
<tr><th>做法</th><td>各雲專線接回地端，跨雲流量在地端轉</td><td>colo 裡的虛擬 router 接多朵雲</td><td>雲端業者託管的互連</td></tr>
<tr><th>優點</th><td>重用既有線路與防火牆</td><td>低延遲、頻寬彈性、不經地端</td><td>託管，不用處理實體線路</td></tr>
<tr><th>限制</th><td>延遲高、hairpin，地端成瓶頸</td><td>多一個供應商，路由與 HA 自己設計</td><td>支援的 region 與合作雲有限</td></tr>
<tr><th>適合</th><td>跨雲流量少，DC 仍是主力</td><td>跨雲流量中等以上</td><td>主要 region 有支援、流量大</td></tr>
</tbody></table></div>
<h2 id="status">AWS Interconnect – multicloud 狀態</h2>
<ul class="pts">
<li><b>2026-04：</b>正式推出，首家合作雲為 Google Cloud，在 5 個 AWS region 提供，可接 Transit Gateway 或 Cloud WAN。</li>
<li><b>2026-07：</b>Oracle Cloud Infrastructure 正式支援，目前在 us-east-1。</li>
<li><b>Azure：</b>AWS 官方表示會在 2026 年稍晚加入。</li>
</ul>
<p>資料來源：<a href="https://aws.amazon.com/es/about-aws/whats-new/2026/04/aws-announces-ga-AWS-interconnect-multicloud/" target="_blank" rel="noopener">AWS What's New（2026-04）</a>、<a href="https://aws.amazon.com/about-aws/whats-new/2026/07/aws-announces-AWS-interconnect-multicloud-OCI-GA/" target="_blank" rel="noopener">AWS What's New（2026-07）</a>。</p>
<h2 id="design">設計重點</h2>
<ul class="pts">
<li><b>備援：</b>至少兩條線、兩個地點；VPN 當最後備援。</li>
<li><b>加密：</b>專線本身不加密，需要時用 MACsec 或在上面跑 IPsec。</li>
<li><b>路由：</b>先規劃全企業的 BGP ASN，設定 route filter，只宣告需要互通的網段。</li>
<li><b>檢查點：</b>跨雲進來的流量一樣經過 hub 的 inspection。</li>
<li><b>成本：</b>跨雲資料傳輸費常常比線路費高，架構決策前先估流量。</li>
</ul>
<h2 id="taiwan">台灣客戶的注意事項</h2>
<p>先確認主要使用的 region 是否在雲對雲直連的支援清單內。地端資料中心仍是主力的客戶，多半先從做法 A 開始，等跨雲流量成長再評估 B 或 C。</p>
''')

# ---------------------------------------------------------------- 12
def d12():
    b = []
    b.append(R(40, 56, 220, 140, 'nb', 12))
    b.append(T(150, 78, '現況', 'tt-s', 'middle'))
    for (x, y, z) in [(96, 98, 'z-ext'), (176, 98, 'z-dmz'), (96, 138, 'z-int'), (176, 138, 'z-mgmt')]:
        b.append(f'<g class="{z}">{R(x, y, 28, 22, "nd", 4)}</g>')
    for d in ['M124 109 H176', 'M124 149 H176', 'M110 120 V138', 'M190 120 V138', 'M124 120 L176 138', 'M176 120 L124 138']:
        b.append(L(d, 'bad'))
    b.append(T(150, 180, '單一帳號 + 網狀 peering', 'tm', 'middle'))
    b.append(R(700, 56, 220, 140, 'nb', 12))
    b.append(T(810, 78, '目標', 'tt-s', 'middle'))
    for (x, z) in [(724, 'z-mgmt'), (786, 'z-dmz'), (848, 'z-int')]:
        b.append(f'<g class="{z}">{R(x, 94, 48, 46, "nd", 6)}</g>')
    b.append(R(724, 150, 172, 12, 'nk', 4))
    b.append(T(810, 180, 'OU + hub-and-spoke', 'tm', 'middle'))
    b.append(A('M270 126 H690'))
    b.append(P(480, 126, '4 個步驟，可分批進行'))
    b.append(L('M142 232 H818'))
    cards = [
        ('止血', [{'aws': '建立 Organization', 'azure': '建立 MG 階層', 'gcp': '建立 Folder 階層'}, '現有帳號先放進',
                {'aws': 'Transitional OU', 'azure': '過渡用 MG', 'gcp': '過渡用 folder'}, '偵測新增 peering 與公網'], 'L'),
        ('建 hub', [{'aws': '開 Network 帳號與 TGW', 'azure': '開 Connectivity 訂閱', 'gcp': '開 hub host project'}, '現有 VPC 逐一接上 hub',
                   '逐條拆掉 peering', '流量改經 inspection'], 'M'),
        ('搬 Mgmt', ['Log、資安工具搬到', {'aws': 'Security OU 獨立帳號', 'azure': 'Management 訂閱', 'gcp': 'common folder'},
                    {'aws': '啟用 org trail', 'azure': '啟用集中 Log Analytics', 'gcp': '啟用 org 層 log sink'}, '與不可竄改儲存'], 'L'),
        ('新舊分流', ['新 workload 開新帳號', '舊系統改版時再搬', '偵測確認無誤後',
                    {'aws': '改成 SCP deny', 'azure': 'Policy 改成 deny', 'gcp': 'Org Policy 正式生效'}], 'M'),
    ]
    for i, (title, lines, risk) in enumerate(cards):
        x = 40 + i * 225
        cx = x + 102.5
        b.append(R(x, 256, 205, 250, 'nb', 12))
        b.append(T(x + 16, 286, title, 'tt'))
        for j, s in enumerate(lines):
            b.append(TC(x + 16, 320 + j * 26, s, 'ts'))
        rc, rt = ('v-allow', '風險：低') if risk == 'L' else ('v-inspect', '風險：中')
        b.append(R(x + 16, 452, 84, 28, rc, 6))
        b.append(T(x + 58, 466, rt, f'ts {rc}-t', 'middle'))
        b.append(B(cx, 232, i + 1))
    return svg(960, 530, b, '從錯誤架構轉移的四個步驟')

T12 = dict(
    num='12', slug='12-migration-path', title='遷移路徑', short='遷移路徑',
    lede='客戶已經是「單一帳號 + 網狀 peering」時，分四步轉到 OU + hub，不需要一次重建。',
    zones=['dmz', 'int', 'mgmt'], svg=d12,
    caption='四個步驟可以分批進行。Guardrail 先偵測、確認不影響現有服務後才改成阻擋。',
    services={
        'aws': [('AWS Control Tower', '把現有帳號 enroll 進 landing zone'),
                ('AWS Organizations', '建立 OU，搬移帳號'),
                ('AWS Config rules', '先偵測新增的 peering 與 IGW'),
                ('Transit Gateway + RAM', '建 hub，逐一接上現有 VPC'),
                ('CloudTrail organization trail', '集中 log 到 Log Archive')],
        'azure': [('Management groups', '建立 ALZ 階層，搬移訂閱'),
                  ('Azure Policy（audit → deny）', '先稽核，再改成阻擋'),
                  ('Hub VNet / Virtual WAN', '建 hub，逐一 peering'),
                  ('Subscription vending', '新 workload 用範本開訂閱')],
        'gcp': [('Resource Manager', '建立 folder，搬移 project'),
                ('Org Policy dry-run', '先試跑，確認影響範圍'),
                ('Shared VPC / NCC', '建 hub，接上現有 VPC'),
                ('Aggregated log sinks', '集中 log')],
    },
    summary=['不要一次重建：先止血、再建 hub、搬 Mgmt，最後新舊分流。',
             'Guardrail 先偵測再阻擋，避免影響現有服務。',
             'Log 與資安工具先搬，風險低、效益高。',
             '舊系統跟著改版或換約的時機搬，不另開專案硬搬。'],
    deep_lede='每個步驟要做什麼、各雲的對應做法，以及「先偵測再阻擋」怎麼落地。',
    deep='''
<h2 id="principle">原則</h2>
<p>一次全部重建不實際，也風險太高。目標是讓新東西一開始就長在對的地方，舊東西在有機會時逐步搬過去。</p>
<h2 id="step1">1. 止血</h2>
<p>建立 Organization 或 Control Tower，把現有的大帳號放進 Transitional / Exceptions OU。先用 Config rule 偵測新增的 peering 和 IGW，不要一開始就套 SCP deny，以免擋到現有服務的維運動作。</p>
<h2 id="step2">2. 建 hub</h2>
<p>開 Network 帳號和 TGW，用 RAM 共享出去。把現有 VPC 一個一個 attach 上去，確認路由正確後，逐條拆掉 peering，流量改經 inspection VPC。每拆一條就驗證一次連線。</p>
<h2 id="step3">3. 搬 Mgmt</h2>
<p>Log 和資安工具先搬到 Security OU 的獨立帳號，啟用 organization trail 與不可竄改儲存。這一步不影響應用流量，風險低、效益高，適合最早做。</p>
<h2 id="step4">4. 新舊分流</h2>
<p>新 workload 一律開新帳號，直接放在 Workloads OU。舊系統等改版或換約時再搬。偵測規則跑一段時間、確認沒有誤判後，再改成 SCP deny。</p>
<h2 id="detect">先偵測再阻擋</h2>
<div class="tablewrap"><table class="wide"><thead><tr><th>雲</th><th>偵測</th><th>阻擋</th></tr></thead><tbody>
<tr><th>AWS</th><td>AWS Config rules、Control Tower detective controls</td><td>SCP、Control Tower preventive controls</td></tr>
<tr><th>Azure</th><td>Azure Policy effect = audit</td><td>Azure Policy effect = deny</td></tr>
<tr><th>GCP</th><td>Org Policy dry-run</td><td>Org Policy 正式生效</td></tr>
</tbody></table></div>
''')

# ---------------------------------------------------------------- 13
def d13():
    b = []
    heads = [('金融', '內外層異質防火牆'), ('製造', 'IT / OT 分離'), ('零售', 'CDE 獨立成 restricted 子區')]
    for i, (h, s) in enumerate(heads):
        x0 = 40 + i * 300
        b.append(T(x0, 44, h, 'tt'))
        b.append(T(x0, 70, s, 'ts'))
    chain = [(100, 'z-ext', 'Internet'), (170, None, '防火牆 · 廠牌 A'), (240, 'z-dmz', 'DMZ'), (310, None, '防火牆 · 廠牌 B'), (380, 'z-int', 'Internal')]
    for y, z, nm in chain:
        b.append(node(80, y, 200, 44, [('tt-s', nm)], z=z))
    for y in (144, 214, 284, 354):
        b.append(A(f'M180 {y} V{y + 24}'))
    b.append(node(360, 100, 240, 70, [('tt-s', '雲端 / 企業 IT'), ('tm', 'Purdue L4–5')], z='z-int'))
    b.append(node(360, 220, 240, 70, [('tt-s', 'IDMZ'), ('tm', 'L3.5 · historian · broker')], z='z-dmz'))
    b.append(node(360, 340, 240, 84, [('tt-s', 'OT 網路'), ('tm', 'L0–3 · PLC · SCADA · MES')], cls='nk'))
    b.append(A('M480 172 V218', '', True, True))
    b.append(A('M480 292 V338', '', True, True))
    b.append(L('M600 135 H616 V382 H600', 'bad'))
    b.append(X(616, 258))
    b.append(f'<g class="z-int">{R(656, 100, 248, 330, "band", 14)}</g>')
    b.append(T(672, 124, 'Internal zone', 'tt-s'))
    b.append(node(676, 146, 208, 64, [('tt-s', '一般 workload'), ('tm', '電商、會員、庫存')]))
    b.append(node(676, 290, 208, 120, [('tt-s', 'CDE（restricted）'), ('ts', '持卡人資料'), ('tm', '獨立帳號與 segment')], z='z-cde'))
    b.append(A('M780 210 V288'))
    b.append(P(780, 249, 'token API'))
    pts = [['• log 長期留存、不可竄改', '• 先拿到客戶內控條文', '• NGFW 選型受異質要求影響'],
           ['• 雲端不直連 OT', '• OT 資料經 IDMZ 鏡像上雲', '• 對照 IEC 62443'],
           ['• 縮小 PCI DSS 稽核範圍', '• 付款流量不共用 segment', '• CDE 有自己的 guardrail']]
    for i, col in enumerate(pts):
        for j, s in enumerate(col):
            b.append(T(40 + i * 300, 470 + j * 26, s, 'ts'))
    return svg(960, 550, b, '產業別的 zone 調整')

T13 = dict(
    num='13', slug='13-industry', title='產業補充', short='產業補充',
    lede='金融、製造、零售各有一個會改變 zone 設計的要求。',
    zones=['dmz', 'int'], svg=d13,
    caption='左：金融常見的雙層異質防火牆。中：製造業的 Purdue 分層，雲端不直連 OT。右：零售把 CDE 獨立成 restricted 子區。',
    services={
        'aws': [('GWLB + 第三方 NGFW', '與 Network Firewall 組成異質防火牆'),
                ('S3 Object Lock', 'log 長期留存、不可刪改'),
                ('AWS IoT SiteWise', 'OT 資料經 edge gateway 上雲'),
                ('AWS Artifact', '下載合規報告'),
                ('獨立 CDE 帳號', '縮小 PCI DSS 範圍')],
        'azure': [('Azure Firewall + NVA', '異質防火牆組合'),
                  ('Immutable Blob storage', 'log 長期留存'),
                  ('Azure IoT Operations', '工廠端的資料收集與轉送'),
                  ('Defender for IoT', 'OT 網路的資產與威脅監控'),
                  ('Service Trust Portal', '下載合規報告')],
        'gcp': [('Cloud NGFW + 第三方 NVA', '異質防火牆組合'),
                ('Bucket Lock', 'log 長期留存'),
                ('Manufacturing Data Engine', '工廠資料上雲與建模'),
                ('Assured Workloads', '依法規套用控管'),
                ('Compliance Reports Manager', '下載合規報告')],
    },
    summary=['金融：內外層異質防火牆，log 不可竄改且長期留存。',
             '製造：IT / OT 分離，雲端只接 IDMZ，不直連 OT。',
             '零售：CDE 獨立成 restricted 子區，縮小 PCI DSS 範圍。',
             '先拿到客戶的內控條文或稽核要求，再定 zone 細節。'],
    deep_lede='三個產業各自的要求怎麼影響 zone 設計，以及開始設計前該問客戶的問題。',
    deep='''
<h2 id="finance">金融</h2>
<ul class="pts">
<li>不少客戶的內控要求內外層防火牆異質（不同廠牌）。常見組合是外層用雲原生 firewall，內層用第三方 NGFW，或反過來。</li>
<li>DMZ 與內部區要有明確隔離，east-west 流量也常要求經過檢查。</li>
<li>Log 長期留存且不可竄改，保留期限依客戶內控與主管機關要求。</li>
<li>選 NGFW 和規劃 log 架構之前，先拿到客戶的內控條文。</li>
</ul>
<h2 id="manufacturing">製造</h2>
<ul class="pts">
<li>IT 和 OT 要分開。雲端與企業 IT 在 Purdue 模型的 L4–5，OT 在 L0–3，中間是 IDMZ（L3.5）。</li>
<li>OT 資料經 IDMZ 的 historian 或 message broker 鏡像上雲，雲端不直接連 OT。</li>
<li>可以對照 IEC 62443 的 zones and conduits，把 OT 的分區對應到雲上的 zone 矩陣。</li>
</ul>
<h2 id="retail">零售</h2>
<ul class="pts">
<li>PCI DSS 的持卡人資料環境（CDE）獨立成 restricted 子區，有自己的帳號、segment 和 guardrail。</li>
<li>其他系統只透過 token 化 API 與 CDE 互動，縮小稽核範圍。</li>
<li>付款流量不和一般 Internal 共用 segment。</li>
</ul>
<h2 id="ask">開始設計前該問客戶的問題</h2>
<ol class="steps">
<li>有哪些內控條文或法規要求會影響網路分區？</li>
<li>防火牆是否要求異質？由誰維運？</li>
<li>Log 要保留多久？誰能存取？</li>
<li>有沒有 OT、支付、個資等需要獨立分區的系統？</li>
<li>地端資料中心未來幾年的角色是什麼？</li>
</ol>
''')

TOPICS_B = [T08, T09, T10, T11, T12, T13]

CHECKLIST = [
    ('z-mgmt', '共同', '每個 zone 對應到帳號層（account / subscription / project），並有對應的 OU / MG / Folder guardrail'),
    ('z-mgmt', '共同', '全企業 IPAM，CIDR 不重疊，每一層都有保留段'),
    ('z-mgmt', '共同', 'Hybrid DNS 架構已定：權威在哪、轉送規則、private zone 歸屬'),
    ('z-ext', 'External', 'Edge 方案已決定（原生或第三方），公開網域與憑證集中管理'),
    ('z-dmz', 'DMZ', 'Ingress 集中或分散已決定，WAF 規則由 platform team 統一管理'),
    ('z-dmz', 'DMZ', 'Egress 經 DMZ，有 FQDN allowlist，TLS inspection 範圍已和法遵確認'),
    ('z-dmz', 'DMZ', 'Stateful 防火牆的路由對稱性已驗證'),
    ('z-int', 'Internal', 'Internal spoke 以 policy 禁止公網出口與自建 peering'),
    ('z-int', 'Internal', 'PaaS 關閉 public access，走 private endpoint 加 resource policy'),
    ('z-mgmt', 'Mgmt', '管理存取不開 SSH / RDP 對外，break-glass 帳號已建立並有監控'),
    ('z-mgmt', 'Mgmt', '三朵雲的 log 匯入同一個 SIEM，log archive 不可竄改'),
    ('z-ext', '互連', '跨雲互連的路徑、頻寬、egress 成本與故障切換已驗證'),
    ('z-mgmt', '共同', 'Zone 流量矩陣已和客戶逐格確認，並有定期驗證機制'),
]

SOURCES = [
    ('https://aws.amazon.com/es/about-aws/whats-new/2026/04/aws-announces-ga-AWS-interconnect-multicloud/', 'AWS Interconnect – multicloud 正式推出', "AWS What's New，2026-04"),
    ('https://aws.amazon.com/about-aws/whats-new/2026/07/aws-announces-AWS-interconnect-multicloud-OCI-GA/', 'AWS Interconnect – multicloud 支援 OCI', "AWS What's New，2026-07"),
    ('https://docs.aws.amazon.com/solutions/network-security-on-aws/', 'Guidance for Network Security on AWS', 'AWS Solutions'),
    ('https://docs.aws.amazon.com/solutions/latest/centralized-network-inspection-on-aws/guidance-overview.html', 'Centralized Network Inspection on AWS', 'AWS Solutions'),
    ('https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/design-area/network-topology-and-connectivity', 'Network topology and connectivity for Azure', 'Microsoft Cloud Adoption Framework'),
    ('https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/virtual-wan-network-topology', 'Virtual WAN network topology in an Azure landing zone', 'Microsoft Cloud Adoption Framework'),
    ('https://docs.cloud.google.com/architecture/security-foundations/networking', 'Enterprise foundations blueprint: Networking', 'Google Cloud Architecture Center'),
    ('https://docs.cloud.google.com/architecture/deploy-hub-spoke-vpc-network-topology', 'Deploy a hub-and-spoke VPC network topology', 'Google Cloud Architecture Center'),
]
