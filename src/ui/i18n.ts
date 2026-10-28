export type Language = 'en' | 'ko' | 'ja' | 'zh';

export interface LanguageOption {
  id: Language;
  label: string;
  htmlLang: string;
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { id: 'en', label: 'English', htmlLang: 'en' },
  { id: 'ko', label: '한국어', htmlLang: 'ko' },
  { id: 'ja', label: '日本語', htmlLang: 'ja' },
  { id: 'zh', label: '简体中文', htmlLang: 'zh-Hans' },
];

const STORAGE_KEY = 'game1836.language';

type Localized = readonly [ko: string, ja: string, zh: string];

/** Exact UI and game-term translations. Geographic proper names intentionally stay unchanged. */
const TEXT: Record<string, Localized> = {
  // Shell, navigation and common labels.
  'Save': ['저장', '保存', '保存'],
  'Load': ['불러오기', '読込', '加载'],
  'Save Game': ['게임 저장', 'ゲームを保存', '保存游戏'],
  'Load Game': ['게임 불러오기', 'ゲームを読み込む', '加载游戏'],
  'Save the current game': ['현재 게임 저장', '現在のゲームを保存', '保存当前游戏'],
  'Load a saved game': ['저장된 게임 불러오기', '保存したゲームを読み込む', '加载已保存的游戏'],
  'Game saved.': ['게임을 저장했습니다.', 'ゲームを保存しました。', '游戏已保存。'],
  'Game loaded.': ['게임을 불러왔습니다.', 'ゲームを読み込みました。', '游戏已加载。'],
  'Could not save game.': ['게임을 저장하지 못했습니다.', 'ゲームを保存できませんでした。', '无法保存游戏。'],
  'Could not load save.': ['저장 파일을 불러오지 못했습니다.', 'セーブを読み込めませんでした。', '无法加载存档。'],
  'Main navigation': ['주요 메뉴', 'メインナビゲーション', '主导航'],
  'Map mode': ['지도 모드', 'マップモード', '地图模式'],
  'Cycle map mode (M)': ['지도 모드 전환 (M)', 'マップモード切替 (M)', '切换地图模式 (M)'],
  'Click a state to open details and construction': ['주를 클릭해 상세 정보와 건설 메뉴 열기', '州をクリックして詳細と建設を開く', '点击地区打开详情和建设'],
  'Drag or WASD to move · Wheel to zoom': ['드래그 또는 WASD로 이동 · 휠로 확대/축소', 'ドラッグまたはWASDで移動・ホイールでズーム', '拖动或使用WASD移动 · 滚轮缩放'],
  'Choose a building below to add one level to the construction queue.': ['아래 건물을 선택하면 건설 대기열에 1단계가 추가됩니다.', '下の施設を選ぶと建設キューに1レベル追加されます。', '选择下方建筑可向建设队列添加一级。'],
  'Construction is only available in your own states.': ['건설은 자국의 주에서만 할 수 있습니다.', '建設は自国の州でのみ行えます。', '只能在本国地区进行建设。'],
  'Language': ['언어', '言語', '语言'],
  'A world on the edge of steam and empire. Choose the nation you will guide.': [
    '증기와 제국의 시대가 시작됩니다. 이끌 국가를 선택하세요.',
    '蒸気と帝国の時代が始まる。導く国家を選んでください。',
    '蒸汽与帝国的时代即将开启。请选择你要领导的国家。',
  ],
  'Search countries…': ['국가 검색…', '国家を検索…', '搜索国家…'],
  'Search countries': ['국가 검색', '国家を検索', '搜索国家'],
  'Observe': ['관전', '観戦', '观战'],
  'Observer': ['관전자', '観戦者', '观察者'],
  'No countries match that search.': ['검색 결과가 없습니다.', '一致する国家がありません。', '没有匹配的国家。'],
  'Details': ['세부 정보', '詳細', '详情'],
  'Close (Esc)': ['닫기 (Esc)', '閉じる (Esc)', '关闭 (Esc)'],
  'Open': ['열기', '開く', '打开'],
  'Open national briefing (O)': ['국가 전략 브리핑 열기 (O)', '国家戦略ブリーフィングを開く (O)', '打开国家战略简报 (O)'],
  'Open the market panel': ['시장 패널 열기', '市場パネルを開く', '打开市场面板'],
  'Open the construction panel': ['건설 패널 열기', '建設パネルを開く', '打开建设面板'],
  'Open the politics panel (P)': ['정치 패널 열기 (P)', '政治パネルを開く (P)', '打开政治面板 (P)'],
  'Open the technology panel (T)': ['기술 패널 열기 (T)', '技術パネルを開く (T)', '打开科技面板 (T)'],
  'Open the diplomacy panel (Shift+D)': ['외교 패널 열기 (Shift+D)', '外交パネルを開く (Shift+D)', '打开外交面板 (Shift+D)'],
  'Open the war panel (Shift+W)': ['전쟁 패널 열기 (Shift+W)', '戦争パネルを開く (Shift+W)', '打开战争面板 (Shift+W)'],
  'Open the navy panel (N)': ['해군 패널 열기 (N)', '海軍パネルを開く (N)', '打开海军面板 (N)'],
  'Open the war view (Shift+W).': ['전쟁 화면 열기 (Shift+W).', '戦争画面を開く (Shift+W)。', '打开战争视图 (Shift+W)。'],
  'Pause / resume (Space)': ['일시정지 / 재개 (Space)', '一時停止 / 再開 (Space)', '暂停 / 继续 (Space)'],
  'Overview': ['개요', '概要', '概览'],
  'Strategic Briefing': ['전략 브리핑', '戦略ブリーフィング', '战略简报'],
  'National strategic briefing (O)': ['국가 전략 브리핑 (O)', '国家戦略ブリーフィング (O)', '国家战略简报 (O)'],
  'Market': ['시장', '市場', '市场'],
  'Construction': ['건설', '建設', '建设'],
  'Politics': ['정치', '政治', '政治'],
  'Laws': ['법률', '法律', '法律'],
  'Technology': ['기술', '技術', '科技'],
  'Diplomacy': ['외교', '外交', '外交'],
  'War': ['전쟁', '戦争', '战争'],
  'Wars': ['전쟁', '戦争', '战争'],
  'Navy': ['해군', '海軍', '海军'],
  'State': ['주', '州', '地区'],
  'States': ['주', '州', '地区'],
  'Country': ['국가', '国家', '国家'],
  'Capital': ['수도', '首都', '首都'],
  'Owner': ['소유국', '領有国', '所属国'],
  'Modern region': ['현대 행정구역', '現代の地域', '现代地区'],
  'Area': ['면적', '面積', '面积'],
  'Total area': ['총면적', '総面積', '总面积'],
  'Population': ['인구', '人口', '人口'],
  'Decentralized lands': ['분권화 지역', '分権地域', '分散地区'],
  'No organised economy': ['조직된 경제 없음', '組織経済なし', '无组织化经济'],
  'No economic data for this country.': ['이 국가의 경제 데이터가 없습니다.', 'この国家の経済データはありません。', '该国家没有经济数据。'],
  'No economic data for this state.': ['이 주의 경제 데이터가 없습니다.', 'この州の経済データはありません。', '该地区没有经济数据。'],
  'These lands have no market, buildings or pops.': ['이 지역에는 시장과 건물, 인구 계층이 없습니다.', 'この地域には市場、施設、人口階層がありません。', '该地区没有市场、建筑或人口阶层。'],
  'No market data.': ['시장 데이터가 없습니다.', '市場データはありません。', '没有市场数据。'],
  'No buildings.': ['건물이 없습니다.', '施設はありません。', '没有建筑。'],
  'None. Naval bases and ports can only be built in coastal states.': ['없음. 해군 기지와 항구는 해안 주에만 건설할 수 있습니다.', 'なし。海軍基地と港は沿岸州にのみ建設できます。', '无。海军基地和港口只能建在沿海地区。'],
  'Nothing can be built here.': ['이곳에는 건설할 수 없습니다.', 'ここには建設できません。', '此处无法建设。'],
  'Select a country to see its market.': ['시장을 확인할 국가를 선택하세요.', '市場を確認する国家を選んでください。', '请选择要查看市场的国家。'],
  'Select a country to see its construction queue.': ['건설 대기열을 확인할 국가를 선택하세요.', '建設キューを確認する国家を選んでください。', '请选择要查看建设队列的国家。'],
  'Select a country to see its politics.': ['정치를 확인할 국가를 선택하세요.', '政治を確認する国家を選んでください。', '请选择要查看政治的国家。'],
  'Select a country to see its laws.': ['법률을 확인할 국가를 선택하세요.', '法律を確認する国家を選んでください。', '请选择要查看法律的国家。'],
  'Select a country to see its technology.': ['기술을 확인할 국가를 선택하세요.', '技術を確認する国家を選んでください。', '请选择要查看科技的国家。'],
  'Select a country to see its diplomacy.': ['외교를 확인할 국가를 선택하세요.', '外交を確認する国家を選んでください。', '请选择要查看外交的国家。'],
  'Select a country to see its wars.': ['전쟁을 확인할 국가를 선택하세요.', '戦争を確認する国家を選んでください。', '请选择要查看战争的国家。'],
  'Select a country to see its navy.': ['해군을 확인할 국가를 선택하세요.', '海軍を確認する国家を選んでください。', '请选择要查看海军的国家。'],
  'No construction data.': ['건설 데이터가 없습니다.', '建設データはありません。', '没有建设数据。'],
  'No political data for this country.': ['이 국가의 정치 데이터가 없습니다.', 'この国家の政治データはありません。', '该国家没有政治数据。'],
  'No organised movements.': ['조직된 정치 운동이 없습니다.', '組織された政治運動はありません。', '没有有组织的政治运动。'],
  'Read-only: you are observing this country.': ['읽기 전용: 이 국가를 관전 중입니다.', '読み取り専用：この国家を観戦中です。', '只读：你正在观察该国家。'],

  // Economy.
  'GDP': ['GDP', 'GDP', 'GDP'],
  'Treasury': ['국고', '国庫', '国库'],
  'Income / expenses': ['수입 / 지출', '収入 / 支出', '收入 / 支出'],
  'Income': ['수입', '収入', '收入'],
  'Expenses': ['지출', '支出', '支出'],
  'Net': ['순수지', '純収支', '净收支'],
  'Income tax': ['소득세', '所得税', '所得税'],
  'Income tax rate': ['소득세율', '所得税率', '所得税率'],
  'Taxed on wages and dividends; peasants pay nothing.': [
    '임금과 배당에 과세하며 소작농은 세금을 내지 않습니다.',
    '賃金と配当に課税し、農民は免税です。',
    '对工资和分红征税，农民无需缴税。',
  ],
  'Good': ['상품', '商品', '商品'],
  'Price': ['가격', '価格', '价格'],
  'Supply': ['공급', '供給', '供应'],
  'Demand': ['수요', '需要', '需求'],
  'Building': ['건물', '施設', '建筑'],
  'Buildings': ['건물', '施設', '建筑'],
  'Pops': ['인구 계층', '人口階層', '人口阶层'],
  'Type': ['유형', '種類', '类型'],
  'Count': ['수', '人数', '数量'],
  'Standard of living': ['생활 수준', '生活水準', '生活水平'],
  'Levels': ['레벨', 'レベル', '等级'],
  'Lvl': ['레벨', 'Lv', '等级'],
  'Staff': ['고용', '雇用', '雇员'],
  'Profit': ['이익', '利益', '利润'],
  'Cost': ['비용', '費用', '成本'],
  'Build': ['건설', '建設', '建造'],
  'At capacity': ['한도 도달', '上限', '已达上限'],
  'Queued projects': ['건설 대기열', '建設キュー', '建设队列'],
  'Nothing under construction. Open a state to queue buildings.': ['건설 중인 항목이 없습니다. 주를 열어 건물을 대기열에 추가하세요.', '建設中の項目はありません。州を開いて施設をキューに追加してください。', '当前没有建设项目。打开地区以将建筑加入队列。'],
  'Cancel project': ['건설 취소', '建設を中止', '取消建设'],
  'Nothing': ['없음', 'なし', '无'],
  'Production': ['생산', '生産', '生产'],
  'Society': ['사회', '社会', '社会'],
  'Military': ['군사', '軍事', '军事'],

  // Politics and technology.
  'Government': ['정부', '政府', '政府'],
  'Legitimacy': ['정통성', '正統性', '合法性'],
  'Interest groups': ['이익 집단', '利益集団', '利益集团'],
  'Interest groups, government and legitimacy (P)': ['이익 집단·정부·정통성 (P)', '利益集団・政府・正統性 (P)', '利益集团、政府与合法性 (P)'],
  'Laws and enactments (L)': ['법률과 제정 (L)', '法律と制定 (L)', '法律与立法 (L)'],
  'Research and technologies (T)': ['연구와 기술 (T)', '研究と技術 (T)', '研究与科技 (T)'],
  'Group': ['집단', '集団', '集团'],
  'In gov.': ['정부 참여', '政府内', '政府内'],
  'Clout': ['정치력', '影響力', '政治力量'],
  'Approval': ['지지도', '支持度', '支持度'],
  'Angry': ['격앙', '激怒', '愤怒'],
  'Content': ['만족', '満足', '满意'],
  'Neutral': ['중립', '中立', '中立'],
  'Add to government': ['정부에 추가', '政府に加える', '加入政府'],
  'Remove from government': ['정부에서 제외', '政府から外す', '移出政府'],
  'A government needs between 1 and 4 interest groups.': [
    '정부에는 1~4개의 이익 집단이 필요합니다.',
    '政府には1～4の利益集団が必要です。',
    '政府需要由1至4个利益集团组成。',
  ],
  'No interest group in government.': ['정부에 참여한 이익 집단이 없습니다.', '政府内に利益集団がありません。', '政府中没有利益集团。'],
  'No interest group has a strong opinion.': ['뚜렷한 입장을 가진 이익 집단이 없습니다.', '強い意見を持つ利益集団はありません。', '没有利益集团持强烈立场。'],
  'Movements': ['정치 운동', '政治運動', '政治运动'],
  'Support': ['지지', '支持', '支持'],
  'In force': ['시행 중', '施行中', '已施行'],
  'Being enacted': ['제정 중', '制定中', '立法中'],
  'Allowed': ['제정 가능', '制定可能', '可制定'],
  'Locked': ['잠김', '未解禁', '未解锁'],
  'Available': ['사용 가능', '利用可能', '可用'],
  'Enact': ['제정', '制定', '制定'],
  'Cancel': ['취소', 'キャンセル', '取消'],
  'Cancel this enactment': ['법률 제정 취소', '法制定を中止', '取消立法'],
  'Another law is already being enacted.': ['다른 법률을 이미 제정 중입니다.', '別の法律を制定中です。', '另一项法律正在制定中。'],
  'Unknown law': ['알 수 없는 법률', '不明な法律', '未知法律'],
  'Already in force': ['이미 시행 중', 'すでに施行中', '已经施行'],
  'Another law is being enacted': ['다른 법률을 제정 중', '別の法律を制定中', '正在制定另一项法律'],
  'a technology': ['기술', '技術', '一项科技'],
  'Prerequisites are not known yet.': ['필요한 선행 기술이 없습니다.', '前提技術が未研究です。', '尚未掌握前置科技。'],
  'Not available.': ['사용할 수 없습니다.', '利用できません。', '不可用。'],
  'Clout-weighted support for this law (government groups count double).': [
    '정치력을 반영한 법률 지지도입니다. 정부 참여 집단은 두 배로 계산됩니다.',
    '影響力で加重した法律支持率です。政府内の集団は2倍で計算されます。',
    '按政治力量加权的法律支持度，政府内集团按双倍计算。',
  ],
  'Research': ['연구', '研究', '研究'],
  'Researching': ['연구 중', '研究中', '研究中'],
  'Research points': ['연구점', '研究点', '研究点数'],
  'Points per week': ['주간 연구점', '週ごとの研究点', '每周点数'],
  'Known': ['연구 완료', '研究済み', '已掌握'],
  'Known technologies': ['연구된 기술', '研究済み技術', '已掌握科技'],
  'No technology is being researched. Open the technology panel (T)': ['연구 중인 기술이 없습니다. 기술 패널을 여세요 (T).', '研究中の技術がありません。技術パネルを開いてください (T)。', '当前没有研究科技。请打开科技面板 (T)。'],

  // Diplomacy and war.
  'Prestige': ['위신', '威信', '威望'],
  'Prestige —': ['위신 —', '威信 —', '威望 —'],
  'Legitimacy —': ['정통성 —', '正統性 —', '合法性 —'],
  'Convoys —': ['수송선 —', '輸送船 —', '运输船 —'],
  'Crisis': ['위기', '危機', '危机'],
  'Great Power': ['열강', '列強', '列强'],
  'One of the great powers of the world.': ['세계의 열강 중 하나입니다.', '世界の列強の一国です。', '世界列强之一。'],
  'Influence': ['외교력', '外交力', '外交影响力'],
  'Relations': ['관계', '関係', '关系'],
  'Actions': ['행동', '行動', '行动'],
  'Allies': ['동맹국', '同盟国', '盟国'],
  'Ally': ['동맹', '同盟', '盟友'],
  'Rivals': ['경쟁국', '宿敵', '对手'],
  'Rival': ['경쟁국', '宿敵', '对手'],
  'Subjects': ['종속국', '従属国', '附属国'],
  'Overlord': ['종주국', '宗主国', '宗主国'],
  'Your overlord': ['우리 종주국', '自国の宗主国', '我国宗主国'],
  'Army': ['육군', '陸軍', '陆军'],
  'Army strength': ['육군 전력', '陸軍戦力', '陆军实力'],
  'Your army strength': ['우리 육군 전력', '自国の陸軍戦力', '我国陆军实力'],
  'Their army strength': ['상대 육군 전력', '相手の陸軍戦力', '对方陆军实力'],
  'Improve relations': ['관계 개선', '関係改善', '改善关系'],
  'Improving relations': ['관계 개선 중', '関係改善中', '正在改善关系'],
  'Stop improving relations': ['관계 개선 중단', '関係改善を中止', '停止改善关系'],
  'Propose alliance': ['동맹 제안', '同盟を提案', '提议结盟'],
  'Break alliance': ['동맹 파기', '同盟を破棄', '解除同盟'],
  'Declare rival': ['경쟁국 지정', '宿敵に指定', '宣布为对手'],
  'Remove rival': ['경쟁국 해제', '宿敵指定を解除', '取消对手'],
  'You are allied.': ['동맹 관계입니다.', '同盟関係です。', '双方是盟友。'],
  'You are already allied.': ['이미 동맹 관계입니다.', 'すでに同盟関係です。', '已经结盟。'],
  'You are at war with this country.': ['이 국가와 전쟁 중입니다.', 'この国家と交戦中です。', '正在与该国交战。'],
  'You consider them a rival.': ['우리가 이 국가를 경쟁국으로 지정했습니다.', '自国がこの国家を宿敵と見なしています。', '我国将该国视为对手。'],
  'They consider you a rival.': ['상대가 우리를 경쟁국으로 지정했습니다.', '相手が自国を宿敵と見なしています。', '对方将我国视为对手。'],
  'Rival of you': ['우리의 경쟁국', '自国の宿敵', '我国的对手'],
  'No allies.': ['동맹국이 없습니다.', '同盟国はありません。', '没有盟国。'],
  'No subjects.': ['종속국이 없습니다.', '従属国はありません。', '没有附属国。'],
  'No rivals declared.': ['지정한 경쟁국이 없습니다.', '宿敵を指定していません。', '尚未宣布对手。'],
  'No formal ties.': ['공식 외교 관계가 없습니다.', '正式な外交関係はありません。', '没有正式关系。'],
  'Not improving relations with anyone.': ['관계를 개선 중인 국가가 없습니다.', '関係改善中の国家はありません。', '当前未改善与任何国家的关系。'],
  'Spend 1 influence per week to raise relations.': ['매주 외교력 1을 사용해 관계를 개선합니다.', '毎週外交力1を消費して関係を改善します。', '每周消耗1点外交影响力来改善关系。'],
  'Stop spending influence on this country.': ['이 국가에 대한 외교력 사용을 중단합니다.', 'この国家への外交力支出を中止します。', '停止对该国投入外交影响力。'],
  'They are likely to accept.': ['상대가 수락할 가능성이 높습니다.', '相手は受諾する見込みです。', '对方很可能接受。'],
  'At most 3 rivals; breaks any alliance with them.': ['경쟁국은 최대 3개이며 지정 시 동맹이 파기됩니다.', '宿敵は最大3か国で、指定すると同盟は破棄されます。', '最多可指定3个对手，并会解除与其同盟。'],
  'Stop treating them as a rival.': ['경쟁국 지정을 해제합니다.', '宿敵指定を解除します。', '不再将其视为对手。'],
  'Diplomatic play': ['외교전', '外交戦', '外交博弈'],
  'Diplomatic play…': ['외교전…', '外交戦…', '外交博弈…'],
  'Diplomatic plays': ['외교전', '外交戦', '外交博弈'],
  'Start play': ['외교전 시작', '外交戦を開始', '发起外交博弈'],
  'Pick at least one war goal.': ['전쟁 목표를 하나 이상 선택하세요.', '戦争目標を1つ以上選んでください。', '请至少选择一个战争目标。'],
  'Choose up to three war goals and start a play.': ['전쟁 목표를 최대 3개 선택해 외교전을 시작합니다.', '戦争目標を最大3つ選んで外交戦を開始します。', '最多选择三个战争目标并发起外交博弈。'],
  'Start a diplomatic play; it resolves in a few weeks.': ['외교전을 시작하며 몇 주 뒤 결론이 납니다.', '外交戦を開始し、数週間後に決着します。', '发起外交博弈，将在数周后解决。'],
  'Humiliate': ['굴욕 주기', '屈辱', '羞辱'],
  'Make subject': ['종속국화', '従属国化', '附属国化'],
  'No war goals.': ['전쟁 목표가 없습니다.', '戦争目標はありません。', '没有战争目标。'],
  'No war goals are possible against this country.': ['이 국가를 상대로 설정할 수 있는 전쟁 목표가 없습니다.', 'この国家に対して設定できる戦争目標はありません。', '无法对该国设定战争目标。'],
  'Initiator': ['개시국', '開始国', '发起方'],
  'Target': ['목표', '目標', '目标'],
  'Attackers': ['공격 측', '攻撃側', '进攻方'],
  'Defenders': ['방어 측', '防御側', '防守方'],
  'Landing': ['상륙', '上陸', '登陆'],
  'Back down': ['양보', '譲歩', '退让'],
  'Concede the play; a truce follows.': ['외교전에서 양보하며 이후 휴전이 적용됩니다.', '外交戦で譲歩し、その後休戦となります。', '在外交博弈中退让，随后进入停战期。'],
  'Mobilise': ['동원', '動員', '动员'],
  'Demobilise': ['동원 해제', '動員解除', '解除动员'],
  'Call up conscripts (more battalions, higher upkeep).': ['징집병을 소집합니다. 대대와 유지비가 증가합니다.', '徴集兵を招集します。大隊数と維持費が増えます。', '征召士兵，增加营数和维护费。'],
  'Send the conscripts home.': ['징집병을 귀향시킵니다.', '徴集兵を帰郷させます。', '遣散征召兵。'],
  'At war': ['전쟁 중', '戦争中', '战争中'],
  'You are at peace.': ['평화 상태입니다.', '自国は平時です。', '我国处于和平状态。'],
  'This country is at peace.': ['이 국가는 평화 상태입니다.', 'この国家は平時です。', '该国处于和平状态。'],
  'No diplomatic play is under way.': ['진행 중인 외교전이 없습니다.', '進行中の外交戦はありません。', '当前没有外交博弈。'],
  'Open war': ['전쟁 보기', '戦争を開く', '查看战争'],
  'War score': ['전쟁 점수', '戦争スコア', '战争分数'],
  'Front': ['전선', '戦線', '战线'],
  'Fronts': ['전선', '戦線', '战线'],
  'No fronts: the armies do not share a border. Land troops from the sea to open one.': ['전선이 없습니다. 양측 육군이 국경을 맞대고 있지 않습니다. 해상 상륙으로 전선을 개설하세요.', '戦線がありません。両軍は国境を接していません。海上上陸で戦線を開いてください。', '没有战线：双方陆军不接壤。请通过海上登陆开辟战线。'],
  'Positive favours the attackers.': ['양수는 공격 측에 유리합니다.', '正の値は攻撃側が優勢です。', '正值表示进攻方占优。'],
  'Generals': ['장군', '将軍', '将领'],
  'Last battles': ['최근 전투', '最近の戦闘', '最近战斗'],
  'No battles yet.': ['아직 전투가 없습니다.', 'まだ戦闘はありません。', '尚未发生战斗。'],
  'Tick': ['주차', '週', '周次'],
  'Att.': ['공격', '攻', '攻'],
  'Def.': ['방어', '防', '防'],
  'Won': ['승리', '勝利', '胜利'],
  'Lost': ['패배', '敗北', '失败'],
  'won': ['승리', '勝利', '胜利'],
  'lost': ['패배', '敗北', '失败'],
  'Result': ['결과', '結果', '结果'],
  'Offer white peace': ['백지 평화 제안', '白紙和平を提案', '提议无条件和平'],
  'End the war with no gains for either side.': ['양측 모두 이득 없이 전쟁을 끝냅니다.', '双方とも利益なしで戦争を終結します。', '双方均无所得地结束战争。'],
  'Capitulate': ['항복', '降伏', '投降'],
  'Accept the enemy war goals.': ['적의 전쟁 목표를 수용합니다.', '敵の戦争目標を受け入れます。', '接受敌方战争目标。'],
  'Only the leader of your side can negotiate.': ['진영 지도국만 협상할 수 있습니다.', '陣営の盟主だけが交渉できます。', '只有本方领袖可以谈判。'],
  'Only the leader of your side can capitulate.': ['진영 지도국만 항복할 수 있습니다.', '陣営の盟主だけが降伏できます。', '只有本方领袖可以投降。'],

  // Navy.
  'Fleet': ['함대', '艦隊', '舰队'],
  'Flotillas': ['전단', '小艦隊', '分舰队'],
  'Readiness': ['준비도', '即応度', '战备度'],
  'Naval bases and ports': ['해군 기지와 항구', '海軍基地と港', '海军基地与港口'],
  'No admirals: build naval bases on the coast to raise a fleet.': ['제독이 없습니다. 해안에 해군 기지를 건설해 함대를 편성하세요.', '提督がいません。沿岸に海軍基地を建設して艦隊を編成してください。', '没有海军将领：请在沿海建设海军基地以组建舰队。'],
  'Naval base': ['해군 기지', '海軍基地', '海军基地'],
  'Port': ['항구', '港', '港口'],
  'One flotilla per staffed naval base level.': ['인력이 충원된 해군 기지 레벨당 전단 1개를 제공합니다.', '人員が充足した海軍基地1レベルにつき小艦隊1個です。', '每个满员海军基地等级提供1支分舰队。'],
  'Share of timber and stores the naval bases obtained.': ['해군 기지가 확보한 목재와 보급품의 비율입니다.', '海軍基地が確保した木材と物資の割合です。', '海军基地获得的木材和补给比例。'],
  'Wartime orders': ['전시 명령', '戦時命令', '战时命令'],
  'Raiders sink enemy convoys; escorts protect your convoys and invasions.': ['습격대는 적 수송선을 격침하고 호위대는 우리 수송선과 상륙군을 보호합니다.', '襲撃艦隊は敵輸送船を沈め、護衛艦隊は自国の輸送船と上陸軍を守ります。', '袭击舰队击沉敌方运输船，护航舰队保护本国运输船和登陆部队。'],
  'Escort = your fleet not assigned to raiding. Landings fight at 70% strength.': ['호위는 습격 임무에 배정되지 않은 함대입니다. 상륙군은 70% 전력으로 전투합니다.', '護衛は襲撃任務に割り当てられていない艦隊です。上陸軍は70%の戦力で戦います。', '护航舰队指未执行袭击任务的舰队。登陆部队以70%战力作战。'],
  'The AI sets its own split when at war.': ['AI 국가는 전쟁 중 함대 배분을 스스로 설정합니다.', 'AI国家は戦争中の艦隊配分を自動設定します。', 'AI国家会在战争中自行设置舰队分配。'],
  'Convoys': ['수송선', '輸送船', '运输船'],
  'Capacity': ['수용량', '容量', '容量'],
  'Convoys from staffed ports.': ['인력이 충원된 항구에서 제공되는 수송선입니다.', '人員が充足した港から得られる輸送船です。', '由满员港口提供的运输船。'],
  'Sunk': ['격침', '撃沈', '被击沉'],
  'Sunk by enemy raiders; 5% are replaced every week.': ['적 습격대에 격침된 수송선이며 매주 5%가 보충됩니다.', '敵襲撃艦隊に沈められた輸送船で、毎週5%補充されます。', '被敌方袭击舰队击沉，每周补充5%。'],
  'Overseas states': ['해외 주', '海外州', '海外地区'],
  'States not connected to the capital by land.': ['수도와 육로로 연결되지 않은 주입니다.', '首都と陸路でつながっていない州です。', '未通过陆路与首都相连的地区。'],
  'Sea trade': ['해상 무역', '海上貿易', '海上贸易'],
  'Imports and exports by sea.': ['바다를 통한 수출입입니다.', '海上輸送による輸出入です。', '通过海运进行的进出口。'],
  'Used': ['사용', '使用中', '已使用'],
  'Not enough convoys: world-market access is reduced and armies overseas fight weaker. Build ports.': ['수송선이 부족합니다. 세계 시장 접근성이 낮아지고 해외 육군이 약화됩니다. 항구를 건설하세요.', '輸送船が不足しています。世界市場へのアクセスが低下し、海外軍が弱体化します。港を建設してください。', '运输船不足：世界市场通达度下降，海外军队战斗力减弱。请建造港口。'],
  'Naval invasions': ['해상 침공', '海上侵攻', '海上入侵'],
  'No troops at sea.': ['해상 이동 중인 병력이 없습니다.', '海上移動中の部隊はありません。', '没有海上部队。'],
  'Relations −20.': ['관계 −20.', '関係 −20。', '关系 −20。'],
  'Launch invasion': ['침공 개시', '侵攻開始', '发动入侵'],
  'Recall': ['소환', '撤収', '撤回'],
  'Bring the troops home.': ['병력을 귀환시킵니다.', '部隊を帰還させます。', '将部队召回。'],
  'Embark troops; the fleet escorts them and must beat any enemy fleet before they can land.': ['병력을 승선시킵니다. 함대가 호위하며 상륙 전에 적 함대를 격파해야 합니다.', '部隊を乗船させます。艦隊が護衛し、上陸前に敵艦隊を撃破する必要があります。', '部队登船并由舰队护航，登陆前必须击败敌方舰队。'],
  'No enemy coastal state can be reached by sea.': ['바다로 도달할 수 있는 적 해안 주가 없습니다.', '海路で到達できる敵沿岸州がありません。', '没有可通过海路抵达的敌方沿海地区。'],
  'You need a fleet to land troops overseas.': ['해외에 상륙하려면 함대가 필요합니다.', '海外上陸には艦隊が必要です。', '海外登陆需要舰队。'],
  'Weeks': ['주', '週', '周'],

  // Strategic briefing.
  'Urgent': ['긴급', '緊急', '紧急'],
  'Watch': ['주의', '注意', '注意'],
  'Action': ['조치', '対応', '行动'],
  'Clear': ['양호', '良好', '正常'],
  'Strategic signals': ['전략 신호', '戦略シグナル', '战略信号'],
  'National position': ['국가 현황', '国家情勢', '国家态势'],
  'World standing': ['국제적 위상', '世界的地位', '国际地位'],
  'Sea power': ['해군력', '海軍力', '海上力量'],
  'No active research': ['진행 중인 연구 없음', '研究なし', '无进行中的研究'],
  'No standing army': ['상비군 없음', '常備軍なし', '无常备军'],
  'No military command': ['군 지휘부 없음', '軍司令部なし', '无军事指挥部'],
  'Unranked': ['순위 없음', '順位なし', '未排名'],
  'The treasury is shrinking': ['국고가 감소하고 있습니다', '国庫が減少しています', '国库正在减少'],
  'Construction capacity is idle': ['건설 역량이 유휴 상태입니다', '建設力が遊休状態です', '建设能力处于闲置状态'],
  'Market shortages are constraining buyers': ['시장 공급 부족이 구매를 제한하고 있습니다', '市場不足が購買を制限しています', '市场短缺正在限制购买'],
  'Government legitimacy is weak': ['정부 정통성이 낮습니다', '政府の正統性が低下しています', '政府合法性较低'],
  'No technology is being researched': ['연구 중인 기술이 없습니다', '研究中の技術がありません', '当前没有研究科技'],
  'Influential groups are angry': ['영향력 있는 집단이 격앙되었습니다', '有力な集団が激怒しています', '有影响力的集团十分愤怒'],
  'A political movement is radicalising': ['정치 운동이 급진화하고 있습니다', '政治運動が急進化しています', '政治运动正在激进化'],
  'The country is at war with an unmobilised army': ['전쟁 중이지만 육군이 동원되지 않았습니다', '戦争中ですが陸軍が未動員です', '国家正在战争中，但陆军尚未动员'],
  'War is in progress': ['전쟁이 진행 중입니다', '戦争が進行中です', '战争正在进行'],
  'A diplomatic crisis is developing': ['외교 위기가 진행 중입니다', '外交危機が進行中です', '外交危机正在发展'],
  'The army lacks equipment': ['육군 장비가 부족합니다', '陸軍の装備が不足しています', '陆军装备不足'],
  'Convoy capacity is insufficient': ['수송선 수용량이 부족합니다', '輸送船の容量が不足しています', '运输船运力不足'],
  'Diplomatic influence is available': ['사용 가능한 외교력이 있습니다', '利用可能な外交力があります', '有可用的外交影响力'],
  'No urgent national issue detected': ['긴급한 국가 문제가 감지되지 않았습니다', '緊急の国家問題はありません', '未发现紧急国家问题'],
  'Finances, politics, markets and military logistics are within the briefing thresholds.': ['재정·정치·시장·군수 상태가 안정 범위에 있습니다.', '財政・政治・市場・兵站は安定範囲内です。', '财政、政治、市场和军事后勤均处于稳定范围。'],
  'Select a country to open its strategic briefing.': ['전략 브리핑을 열 국가를 선택하세요.', '戦略ブリーフィングを開く国家を選んでください。', '请选择要查看战略简报的国家。'],

  // Goods.
  'Grain': ['곡물', '穀物', '粮食'],
  'Meat': ['육류', '肉', '肉类'],
  'Fish': ['생선', '魚', '鱼类'],
  'Fruit': ['과일', '果物', '水果'],
  'Wood': ['목재', '木材', '木材'],
  'Cotton': ['면화', '綿花', '棉花'],
  'Wool': ['양모', '羊毛', '羊毛'],
  'Silk': ['비단', '絹', '丝绸'],
  'Dye': ['염료', '染料', '染料'],
  'Tea': ['차', '茶', '茶叶'],
  'Coffee': ['커피', 'コーヒー', '咖啡'],
  'Sugar': ['설탕', '砂糖', '糖'],
  'Tobacco': ['담배', 'タバコ', '烟草'],
  'Coal': ['석탄', '石炭', '煤炭'],
  'Iron': ['철', '鉄', '铁'],
  'Fabric': ['직물', '生地', '织物'],
  'Clothes': ['의류', '衣服', '衣物'],
  'Fine Clothes': ['고급 의류', '高級衣服', '高级服装'],
  'Furniture': ['가구', '家具', '家具'],
  'Groceries': ['가공식품', '加工食品', '加工食品'],
  'Liquor': ['주류', '酒類', '酒类'],
  'Tools': ['공구', '工具', '工具'],
  'Steel': ['강철', '鋼鉄', '钢铁'],
  'Paper': ['종이', '紙', '纸张'],
  'Glass': ['유리', 'ガラス', '玻璃'],
  'Small Arms': ['소화기', '小火器', '轻武器'],
  'Services': ['서비스', 'サービス', '服务'],

  // Population types.
  'Aristocrats': ['귀족', '貴族', '贵族'],
  'Capitalists': ['자본가', '資本家', '资本家'],
  'Bureaucrats': ['관료', '官僚', '官僚'],
  'Clerks': ['사무원', '事務員', '职员'],
  'Shopkeepers': ['상점주', '商店主', '店主'],
  'Machinists': ['기계공', '機械工', '机械工'],
  'Laborers': ['노동자', '労働者', '劳工'],
  'Farmers': ['농민', '農民', '农民'],
  'Soldiers': ['군인', '兵士', '士兵'],
  'Peasants': ['소작농', '小作農', '农民'],

  // Interest groups.
  'Landowners': ['지주', '地主', '地主'],
  'Industrialists': ['산업가', '実業家', '工业家'],
  'Clergy': ['성직자', '聖職者', '教士'],
  'Officer Corps': ['장교단', '将校団', '军官团'],
  'Intelligentsia': ['지식인', '知識人', '知识分子'],
  'Merchants': ['상인', '商人', '商人'],
  'Peasantry': ['농민층', '農民層', '农民阶层'],
  'Workers': ['노동자층', '労働者', '工人'],
  'Estate holders and the old nobility. Defend tradition, privilege and the land.': ['영지 소유자와 구귀족입니다. 전통과 특권, 토지를 수호합니다.', '領地所有者と旧貴族。伝統・特権・土地を守ります。', '庄园主与旧贵族，维护传统、特权与土地。'],
  'Mill and mine owners. Want free labour, open markets and low taxes.': ['공장과 광산 소유자입니다. 자유 노동과 개방 시장, 낮은 세금을 원합니다.', '工場と鉱山の所有者。自由労働、開放市場、低税率を望みます。', '工厂与矿山所有者，追求自由劳工、开放市场和低税收。'],
  'The established faith and its schools. Guardians of morals and order.': ['국교와 종교 학교를 대표하며 도덕과 질서를 지킵니다.', '国教とその学校を代表し、道徳と秩序を守ります。', '代表国教及其学校，维护道德与秩序。'],
  'The officer class. Values a strong crown, discipline and national power.': ['장교 계층입니다. 강한 군주와 규율, 국력을 중시합니다.', '将校階級。強い王権、規律、国力を重視します。', '军官阶层，重视强大王权、纪律与国力。'],
  'Professors, officials and writers. Champions of reform, science and liberty.': ['교수와 관료, 작가로 구성되며 개혁과 과학, 자유를 지지합니다.', '教授・官僚・作家。改革、科学、自由を支持します。', '由教授、官员和作家组成，倡导改革、科学与自由。'],
  'Traders, shopkeepers and clerks. Favour commerce, property and moderate rule.': ['상인과 상점주, 사무원으로 구성되며 상업과 재산권, 온건한 통치를 선호합니다.', '商人・店主・事務員。商業、財産、穏健な統治を好みます。', '商人、店主与职员，支持商业、财产权和温和统治。'],
  'The rural majority. Want land, light taxes and to be left alone.': ['농촌의 다수 계층입니다. 토지와 낮은 세금, 간섭 없는 삶을 원합니다.', '農村の多数派。土地、軽い税、干渉されない生活を望みます。', '农村多数人口，希望获得土地、低税收与较少干预。'],
  'Labourers and machinists of the new towns. Seek better wages and a voice.': ['신흥 도시의 노동자와 기계공입니다. 더 나은 임금과 정치적 발언권을 요구합니다.', '新興都市の労働者と機械工。より良い賃金と発言権を求めます。', '新兴城市的劳工与机械工，争取更高工资和政治发言权。'],

  // Law groups and laws.
  'Governance': ['통치 체제', '統治体制', '治理体制'],
  'Franchise': ['선거권', '選挙権', '选举权'],
  'Church and State': ['종교와 국가', '教会と国家', '政教关系'],
  'Trade Policy': ['무역 정책', '貿易政策', '贸易政策'],
  'Labour': ['노동', '労働', '劳工'],
  'Taxation': ['조세', '課税', '税制'],
  'Education': ['교육', '教育', '教育'],
  'Press': ['언론', '報道', '新闻'],
  'Autocracy': ['전제정', '専制政治', '专制制度'],
  'Constitutional Monarchy': ['입헌군주제', '立憲君主制', '君主立宪制'],
  'Republic': ['공화제', '共和制', '共和制'],
  'No Elections': ['선거 없음', '選挙なし', '无选举'],
  'Property Franchise': ['재산 선거권', '財産選挙権', '财产选举权'],
  'Manhood Suffrage': ['성인 남성 보통선거', '成人男性普通選挙', '成年男性普选'],
  'State Church': ['국교', '国教', '国教'],
  'Freedom of Conscience': ['양심의 자유', '良心の自由', '信仰自由'],
  'Secular State': ['세속 국가', '世俗国家', '世俗国家'],
  'Isolationism': ['고립주의', '孤立主義', '孤立主义'],
  'Mercantilism': ['중상주의', '重商主義', '重商主义'],
  'Free Trade': ['자유무역', '自由貿易', '自由贸易'],
  'Serfdom': ['농노제', '農奴制', '农奴制'],
  'Free Labour': ['자유 노동', '自由労働', '自由劳工'],
  'Worker Protections': ['노동자 보호', '労働者保護', '工人保护'],
  'Land and Excise Taxes': ['토지세와 소비세', '土地税と物品税', '土地税与消费税'],
  'Proportional Income Tax': ['비례 소득세', '比例所得税', '比例所得税'],
  'Graduated Income Tax': ['누진 소득세', '累進所得税', '累进所得税'],
  'No Schooling': ['공교육 없음', '学校教育なし', '无公共教育'],
  'Church Schools': ['교회 학교', '教会学校', '教会学校'],
  'Public Schools': ['공립학교', '公立学校', '公立学校'],
  'Censorship': ['검열', '検閲', '审查制度'],
  'Licensed Press': ['허가제 언론', '許可制報道', '特许新闻'],
  'Free Press': ['언론의 자유', '報道の自由', '新闻自由'],
  'The sovereign rules; advisors serve at pleasure.': ['군주가 통치하며 고문은 군주의 뜻에 따릅니다.', '君主が統治し、顧問はその意向に従います。', '君主统治，顾问依其意愿任职。'],
  'A crown bound by a charter and a chamber.': ['헌장과 의회가 군주의 권력을 제한합니다.', '憲章と議会が王権を制限します。', '宪章与议会约束君权。'],
  'Elected officials govern in the name of the people.': ['선출된 공직자가 국민의 이름으로 통치합니다.', '選挙で選ばれた公職者が国民の名の下に統治します。', '民选官员以人民名义治理国家。'],
  'Power follows rank and property alone.': ['신분과 재산만이 정치 권력을 결정합니다.', '身分と財産だけが政治権力を決めます。', '政治权力仅取决于身份与财产。'],
  'Only taxpayers of means may vote.': ['일정 재산을 가진 납세자만 투표할 수 있습니다.', '一定の財産を持つ納税者だけが投票できます。', '只有具备一定财产的纳税人可以投票。'],
  'Every grown man has a vote.': ['모든 성인 남성에게 투표권이 있습니다.', 'すべての成人男性に投票権があります。', '所有成年男性都拥有投票权。'],
  'One faith, upheld and funded by the state.': ['국가가 하나의 종교를 보호하고 재정 지원합니다.', '国家が一つの宗教を保護し、資金を提供します。', '国家维护并资助唯一官方宗教。'],
  'An official faith, but others are tolerated.': ['국교가 존재하지만 다른 종교도 용인됩니다.', '国教はありますが、他の宗教も容認されます。', '设有官方宗教，但容忍其他信仰。'],
  'Church and state are separate.': ['종교와 국가가 분리됩니다.', '教会と国家を分離します。', '政教分离。'],
  'Foreign trade is confined to a few licensed ports.': ['대외 무역이 소수의 허가 항구로 제한됩니다.', '外国貿易を少数の許可港に制限します。', '对外贸易仅限少数特许港口。'],
  'Tariffs and monopolies shelter home industry.': ['관세와 독점으로 국내 산업을 보호합니다.', '関税と独占で国内産業を保護します。', '以关税和垄断保护本国产业。'],
  'Goods flow freely across borders.': ['상품이 국경을 자유롭게 오갑니다.', '商品が国境を自由に行き来します。', '商品可自由跨越国境流通。'],
  'Peasants are bound to their lords’ land.': ['농민이 영주의 토지에 예속됩니다.', '農民は領主の土地に縛られます。', '农民被束缚在领主土地上。'],
  'Workers may sell their labour where they choose.': ['노동자가 원하는 곳에 노동력을 제공할 수 있습니다.', '労働者は望む場所で労働力を売ることができます。', '工人可自由选择出售劳动力的地点。'],
  'Hours, child labour and safety are regulated.': ['노동시간과 아동 노동, 안전 기준을 규제합니다.', '労働時間、児童労働、安全を規制します。', '监管工时、童工和安全标准。'],
  'Revenue from land, salt and drink; much is lost to collectors.': ['토지와 소금, 주류에서 세금을 걷지만 징세 과정의 손실이 큽니다.', '土地、塩、酒から徴税しますが、徴税過程で多く失われます。', '从土地、盐和酒类征税，但征收过程中损耗严重。'],
  'A flat share of every income.': ['모든 소득에 동일한 비율로 과세합니다.', 'すべての所得に同じ税率を課します。', '对所有收入按统一比例征税。'],
  'Higher incomes pay higher rates.': ['소득이 높을수록 더 높은 세율을 적용합니다.', '所得が高いほど高い税率を課します。', '收入越高，适用税率越高。'],
  'Learning is a private matter for those who can afford it.': ['교육은 비용을 감당할 수 있는 개인의 몫입니다.', '教育は費用を負担できる個人の責任です。', '教育仅由有能力负担费用的个人自行解决。'],
  'Parishes teach letters and catechism.': ['교구가 문자와 교리를 가르칩니다.', '教区が読み書きと教理を教えます。', '教区教授识字与教义。'],
  'The state provides elementary schooling for all.': ['국가가 모두에게 초등교육을 제공합니다.', '国家がすべての人に初等教育を提供します。', '国家为所有人提供初等教育。'],
  'Every printed word needs the censor’s stamp.': ['모든 인쇄물에 검열관의 승인이 필요합니다.', 'すべての印刷物に検閲官の承認が必要です。', '所有印刷内容都须经审查批准。'],
  'Newspapers need a licence and a bond.': ['신문 발행에 허가와 보증금이 필요합니다.', '新聞発行には許可と保証金が必要です。', '报纸出版需要许可证和保证金。'],
  'Anyone may print and publish.': ['누구나 자유롭게 인쇄하고 출판할 수 있습니다.', '誰でも自由に印刷・出版できます。', '任何人都可自由印刷出版。'],

  // Technologies.
  'Crop Rotation': ['윤작', '輪作', '轮作'],
  'Mechanical Tools': ['기계 공구', '機械工具', '机械工具'],
  'Mechanical Spinning': ['기계 방적', '機械紡績', '机械纺纱'],
  'Canals': ['운하', '運河', '运河'],
  'Iron Construction': ['철골 건축', '鉄骨建築', '铁结构建筑'],
  'Crucible Steel': ['도가니강', 'るつぼ鋼', '坩埚钢'],
  'Stationary Steam Engines': ['고정식 증기기관', '定置式蒸気機関', '固定式蒸汽机'],
  'Interchangeable Parts': ['호환 부품', '互換部品', '可互换零件'],
  'Railways': ['철도', '鉄道', '铁路'],
  'Line Drill': ['전열 훈련', '戦列教練', '线列操典'],
  'Percussion Caps': ['뇌관', '雷管', '击发帽'],
  'Horse Artillery': ['기마 포병', '騎馬砲兵', '骑兵炮兵'],
  'General Staff': ['참모본부', '参謀本部', '总参谋部'],
  'Rifled Muskets': ['강선 머스킷', 'ライフルド・マスケット', '线膛步枪'],
  'Enlightenment Thought': ['계몽사상', '啓蒙思想', '启蒙思想'],
  'Political Economy': ['정치경제학', '政治経済学', '政治经济学'],
  'Learned Academies': ['학술원', '学術院', '科学院'],
  'Romanticism': ['낭만주의', 'ロマン主義', '浪漫主义'],
  'Statistics': ['통계학', '統計学', '统计学'],
  'Public Education': ['공교육', '公教育', '公共教育'],
  'Popular Sovereignty': ['국민주권', '人民主権', '人民主权'],
  'Labour Rights': ['노동권', '労働権', '劳工权利'],
  'Clover and turnips restore the soil between grain years.': ['클로버와 순무를 재배해 곡물 경작 사이에 지력을 회복합니다.', 'クローバーとカブで穀作の合間に地力を回復します。', '以苜蓿和芜菁在谷物种植间恢复地力。'],
  'Lathes and forges turn out saws, picks and files in quantity.': ['선반과 대장간에서 톱과 곡괭이, 줄을 대량 생산합니다.', '旋盤と鍛冶場で鋸、つるはし、やすりを量産します。', '车床和锻炉可批量生产锯、镐和锉刀。'],
  'Spinning frames and mules move thread-making into mills.': ['방적기와 뮬 정방기가 실 생산을 공장으로 옮깁니다.', '紡績機とミュール精紡機が糸作りを工場へ移します。', '纺纱机和走锭精纺机将纱线生产转入工厂。'],
  'Cut waterways carry bulk goods cheaply inland.': ['인공 수로가 대량 화물을 저렴하게 내륙으로 운반합니다.', '人工水路が大量貨物を安価に内陸へ運びます。', '人工水道可低成本将大宗货物运往内陆。'],
  'Cast-iron frames and beams for mills, bridges and halls.': ['공장과 교량, 대형 건물에 주철 골조와 보를 사용합니다.', '工場、橋、公共建築に鋳鉄の骨組みと梁を使います。', '为工厂、桥梁和大厅采用铸铁框架与梁。'],
  'Steel melted in clay crucibles, hard and even.': ['점토 도가니에서 균질하고 단단한 강철을 제련합니다.', '粘土るつぼで硬く均質な鋼を溶製します。', '在黏土坩埚中熔炼坚硬均匀的钢。'],
  'Engines free mills from the riverbank.': ['증기기관이 공장을 강변의 수력에서 해방합니다.', '蒸気機関が工場を川沿いの水力から解放します。', '蒸汽机使工厂摆脱对河流水力的依赖。'],
  'Gauges and jigs make every part fit every copy.': ['게이지와 지그로 모든 부품을 서로 호환되게 만듭니다.', 'ゲージと治具で部品を相互に交換可能にします。', '量规和夹具使零件可以互换。'],
  'Locomotives on iron rails bind markets together.': ['철로 위의 기관차가 시장을 하나로 연결합니다.', '鉄路を走る機関車が市場を結びます。', '铁轨上的机车将各地市场连接起来。'],
  'Standardised drill turns conscripts into steady infantry.': ['표준화된 훈련이 징집병을 안정적인 보병으로 만듭니다.', '標準化された教練が徴集兵を堅実な歩兵にします。', '标准化操练将征召兵训练成可靠步兵。'],
  'Muskets that fire in the rain.': ['비가 와도 발사할 수 있는 머스킷입니다.', '雨天でも発射できるマスケットです。', '可在雨中射击的滑膛枪。'],
  'Light guns that keep pace with the columns.': ['종대와 보조를 맞출 수 있는 경량 포입니다.', '縦隊に追随できる軽砲です。', '能够跟随纵队行进的轻型火炮。'],
  'Planning, maps and railway timetables for war.': ['전쟁을 위한 계획과 지도, 철도 시간표를 체계화합니다.', '戦争のための計画、地図、鉄道時刻表を体系化します。', '为战争制定计划、地图与铁路时刻表。'],
  'Accurate fire at four hundred paces.': ['400보 거리에서도 정확한 사격이 가능합니다.', '400歩の距離でも正確に射撃できます。', '可在四百步距离进行精确射击。'],
  'Reason, inquiry and the rights of man.': ['이성과 탐구, 인간의 권리를 중시합니다.', '理性、探究、人間の権利を重視します。', '强调理性、探索与人的权利。'],
  'The science of wealth, trade and taxes.': ['부와 무역, 조세를 연구하는 학문입니다.', '富、貿易、税を研究する学問です。', '研究财富、贸易与税收的学问。'],
  'Societies and journals that share discoveries.': ['학회와 학술지가 새로운 발견을 공유합니다.', '学会と学術誌が新たな発見を共有します。', '学会与期刊传播新的发现。'],
  'Art and feeling in service of the nation.': ['예술과 감성을 국가 정체성에 활용합니다.', '芸術と感情を国家のために生かします。', '以艺术与情感服务国家认同。'],
  'Counting people and goods makes administration cheaper.': ['인구와 상품을 집계해 행정 비용을 줄입니다.', '人と物資を数えることで行政費用を削減します。', '统计人口与商品可降低行政成本。'],
  'The case for schooling every child at public expense.': ['모든 아동에게 공공 비용으로 교육을 제공해야 한다는 사상입니다.', 'すべての子どもを公費で教育する考えです。', '主张由公共财政为所有儿童提供教育。'],
  'Government derives its authority from the governed.': ['정부의 권력은 국민에게서 나온다는 사상입니다.', '政府の権威は統治される人民に由来するという思想です。', '政府权威来源于被统治人民。'],
  'Factory acts and the regulation of work.': ['공장법과 노동 규제를 제도화합니다.', '工場法と労働規制を制度化します。', '制定工厂法并规范劳动。'],

  // Buildings and production methods.
  'Grain Farms': ['곡물 농장', '穀物農場', '谷物农场'],
  'Ranches': ['목장', '牧場', '牧场'],
  'Cotton Plantations': ['면화 플랜테이션', '綿花農園', '棉花种植园'],
  'Sugar Plantations': ['설탕 플랜테이션', '砂糖農園', '甘蔗种植园'],
  'Coffee Plantations': ['커피 플랜테이션', 'コーヒー農園', '咖啡种植园'],
  'Tea Gardens': ['차 농장', '茶園', '茶园'],
  'Tobacco Plantations': ['담배 플랜테이션', 'タバコ農園', '烟草种植园'],
  'Indigo Plantations': ['인디고 플랜테이션', '藍農園', '靛蓝种植园'],
  'Silk Farms': ['양잠장', '養蚕場', '桑蚕农场'],
  'Fishing Wharves': ['어항', '漁港', '渔港'],
  'Logging Camps': ['벌목장', '伐採所', '伐木场'],
  'Coal Mines': ['탄광', '炭鉱', '煤矿'],
  'Iron Mines': ['철광', '鉄鉱山', '铁矿'],
  'Textile Mills': ['방직 공장', '繊維工場', '纺织厂'],
  'Garment Works': ['의류 공장', '衣料工場', '服装厂'],
  'Fine Tailors': ['고급 양복점', '高級仕立屋', '高级裁缝铺'],
  'Furniture Workshops': ['가구 공방', '家具工房', '家具作坊'],
  'Food Industry': ['식품 공장', '食品工業', '食品工业'],
  'Distilleries': ['증류소', '蒸留所', '酿酒厂'],
  'Tool Workshops': ['공구 공방', '工具工房', '工具作坊'],
  'Steel Mills': ['제철소', '製鋼所', '钢铁厂'],
  'Paper Mills': ['제지소', '製紙工場', '造纸厂'],
  'Glassworks': ['유리 공장', 'ガラス工場', '玻璃厂'],
  'Arms Workshops': ['무기 공방', '兵器工房', '武器工坊'],
  'Urban Center': ['도심', '都市中心', '城市中心'],
  'Government Administration': ['정부 청사', '政府行政機関', '政府行政机构'],
  'Barracks': ['병영', '兵舎', '兵营'],
  'Construction Sector': ['건설 부문', '建設部門', '建设部门'],
  'Field Gangs': ['농장 작업조', '農場作業班', '田间作业队'],
  'Open Fields': ['개방 경지', '開放耕地', '开放田地'],
  'Open Pasture': ['방목지', '放牧地', '开放牧场'],
  'Sail Boats': ['범선', '帆船', '帆船'],
  'Hand Axes': ['손도끼', '手斧', '手斧'],
  'Saw Mills': ['제재소', '製材所', '锯木厂'],
  'Hand Digging': ['수작업 채굴', '手掘り', '人工挖掘'],
  'Picks and Shovels': ['곡괭이와 삽', 'つるはしとシャベル', '镐与铲'],
  'Cotton Spinning': ['면 방적', '綿紡績', '棉纺'],
  'Wool Weaving': ['양모 직조', '毛織り', '羊毛织造'],
  'Hand Sewing': ['수작업 봉제', '手縫い', '手工缝制'],
  'Dyed Garments': ['염색 의류', '染色衣料', '染色服装'],
  'Silk Tailoring': ['비단 재단', '絹仕立て', '丝绸裁制'],
  'Fine Woollens': ['고급 모직', '高級毛織物', '高级毛织品'],
  'Cabinet Making': ['가구 제작', '家具製作', '细木家具制作'],
  'Bakeries': ['제과점', 'パン工房', '面包房'],
  'Sweet Bakeries': ['제과 공방', '菓子工房', '甜点工坊'],
  'Pot Stills': ['단식 증류기', '単式蒸留器', '壶式蒸馏器'],
  'Rum Distilling': ['럼 증류', 'ラム蒸留', '朗姆酒蒸馏'],
  'Village Forges': ['마을 대장간', '村の鍛冶場', '乡村锻造坊'],
  'Blister Steel': ['침탄강', '浸炭鋼', '渗碳钢'],
  'Rag and Pulp': ['헝겊과 펄프', 'ぼろ布とパルプ', '破布与纸浆'],
  'Wood-fired Furnaces': ['목재 화로', '薪窯', '木燃炉'],
  'Gunsmiths': ['총기 제작', '銃工', '枪械工坊'],
  'Musket Making': ['머스킷 제작', 'マスケット製造', '滑膛枪制造'],
  'Market Towns': ['시장 도시', '市場町', '集镇'],
  'Clerical Offices': ['행정 사무실', '官吏事務所', '文书办公室'],
  'Line Infantry': ['전열보병', '戦列歩兵', '线列步兵'],
  'Ships of the Line': ['전열함', '戦列艦', '风帆战列舰'],
  'Harbour': ['항만', '港湾', '港湾'],
  'Wooden Buildings': ['목조 건물', '木造建築', '木制建筑'],
  'Iron Frames': ['철골 구조', '鉄骨構造', '铁框架'],

  // Traits and small status words.
  'offensive': ['공격형', '攻撃型', '进攻型'],
  'defensive': ['방어형', '防御型', '防御型'],
  'balanced': ['균형형', '均衡型', '均衡型'],
  'attackers': ['공격 측', '攻撃側', '进攻方'],
  'defenders': ['방어 측', '防御側', '防守方'],
  'naval': ['해전', '海戦', '海战'],
  'landing': ['상륙', '上陸', '登陆'],
};

function isLanguage(value: string | null): value is Language {
  return value === 'en' || value === 'ko' || value === 'ja' || value === 'zh';
}

export function initialLanguage(): Language {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (isLanguage(saved)) return saved;
    } catch {
      // Storage can be unavailable in locked-down browser contexts; use the browser locale below.
    }
  }
  if (typeof navigator !== 'undefined') {
    const browser = navigator.language.toLowerCase();
    if (browser.startsWith('ko')) return 'ko';
    if (browser.startsWith('ja')) return 'ja';
    if (browser.startsWith('zh')) return 'zh';
  }
  return 'en';
}

export function saveLanguage(language: Language): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Keeping the current session translated is more important than persistence.
  }
}

export function htmlLanguage(language: Language): string {
  return LANGUAGE_OPTIONS.find((option) => option.id === language)?.htmlLang ?? 'en';
}

export function addLanguageOptions(select: HTMLSelectElement): void {
  select.setAttribute('data-i18n-skip', 'true');
  for (const language of LANGUAGE_OPTIONS) {
    const option = document.createElement('option');
    option.value = language.id;
    option.textContent = language.label;
    select.append(option);
  }
}

function pick(language: Exclude<Language, 'en'>, values: Localized): string {
  return values[language === 'ko' ? 0 : language === 'ja' ? 1 : 2];
}

function exact(source: string, language: Exclude<Language, 'en'>): string {
  const translated = TEXT[source];
  return translated ? pick(language, translated) : source;
}

function countText(language: Exclude<Language, 'en'>, count: string, ko: string, ja: string, zh: string): string {
  if (language === 'ko') return `${count}${ko}`;
  if (language === 'ja') return `${count}${ja}`;
  return `${count}${zh}`;
}

function translateDynamic(source: string, language: Exclude<Language, 'en'>): string {
  let match = source.match(/^(\d{1,2}) (January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})$/);
  if (match) {
    const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(match[2] ?? '') + 1;
    if (language === 'ko') return `${match[3]}년 ${month}월 ${match[1]}일`;
    if (language === 'ja') return `${match[3]}年${month}月${match[1]}日`;
    return `${match[3]}年${month}月${match[1]}日`;
  }

  match = source.match(/^(\d+) states$/);
  if (match) return countText(language, match[1] ?? '0', '개 주', '州', '个地区');
  match = source.match(/^(\d+) (allies|subjects|wars|crises)$/);
  if (match) {
    const word = exact(match[2] ?? '', language);
    return language === 'ko' ? `${word} ${match[1]}` : language === 'ja' ? `${word} ${match[1]}` : `${word} ${match[1]}`;
  }
  match = source.match(/^(.+) (Market|Construction|Politics|Laws|Technology|Diplomacy|Wars|Navy)$/);
  if (match) {
    const country = match[1] ?? '';
    const section = exact(match[2] ?? '', language);
    return language === 'ja' ? `${country}の${section}` : `${country} ${section}`;
  }
  match = source.match(/^Construction (\d+(?:\.\d+)?)\/wk$/);
  if (match) return language === 'ko' ? `건설 ${match[1]}/주` : language === 'ja' ? `建設 ${match[1]}/週` : `建设 ${match[1]}/周`;
  match = source.match(/^Legitimacy (\d+)$/);
  if (match) return language === 'ko' ? `정통성 ${match[1]}` : language === 'ja' ? `正統性 ${match[1]}` : `合法性 ${match[1]}`;
  match = source.match(/^Research: (.+) (\d+)%$/);
  if (match) {
    const tech = exact(match[1] ?? '', language);
    return language === 'ko' ? `연구: ${tech} ${match[2]}%` : language === 'ja' ? `研究：${tech} ${match[2]}%` : `研究：${tech} ${match[2]}%`;
  }
  if (source === 'Research: none') return exact('Research', language) + (language === 'ko' ? ': 없음' : language === 'ja' ? '：なし' : '：无');
  match = source.match(/^Prestige (\d+) · #(\d+)$/);
  if (match) return `${exact('Prestige', language)} ${match[1]} · #${match[2]}`;
  match = source.match(/^At war \((\d+)\)$/);
  if (match) return `${exact('At war', language)} (${match[1]})`;
  match = source.match(/^Speed (\d+) \((\d+)\)$/);
  if (match) return language === 'ko' ? `속도 ${match[1]} (${match[2]})` : language === 'ja' ? `速度 ${match[1]} (${match[2]})` : `速度 ${match[1]} (${match[2]})`;
  match = source.match(/^⚓ (\d+) · Convoys (\d+)\/(\d+)$/);
  if (match) return `⚓ ${match[1]} · ${exact('Convoys', language)} ${match[2]}/${match[3]}`;

  match = source.match(/^(.+) (battalions|flotillas|prestige|legitimacy)$/);
  if (match) {
    const unit = match[2];
    const labels: Record<string, Localized> = {
      battalions: ['개 대대', '個大隊', '个营'],
      flotillas: ['개 전단', '個小艦隊', '支分舰队'],
      prestige: [' 위신', ' 威信', ' 威望'],
      legitimacy: [' 정통성', ' 正統性', ' 合法性'],
    };
    const label = labels[unit ?? ''];
    return label ? `${match[1]}${pick(language, label)}` : source;
  }
  match = source.match(/^Researching (.+)$/);
  if (match) return `${exact('Researching', language)} ${exact(match[1] ?? '', language)}`;
  match = source.match(/^Requires: (.+)$/);
  if (match) return language === 'ko' ? `필요 기술: ${exact(match[1] ?? '', language)}` : language === 'ja' ? `必要技術：${exact(match[1] ?? '', language)}` : `需要科技：${exact(match[1] ?? '', language)}`;
  match = source.match(/^Requires (.+)$/);
  if (match) return language === 'ko' ? `${exact(match[1] ?? '', language)} 필요` : language === 'ja' ? `${exact(match[1] ?? '', language)}が必要` : `需要${exact(match[1] ?? '', language)}`;
  match = source.match(/^Research (.+)$/);
  if (match) return language === 'ko' ? `${exact(match[1] ?? '', language)} 연구` : language === 'ja' ? `${exact(match[1] ?? '', language)}を研究` : `研究${exact(match[1] ?? '', language)}`;
  match = source.match(/^Begin enacting (.+)$/);
  if (match) return language === 'ko' ? `${exact(match[1] ?? '', language)} 제정 시작` : language === 'ja' ? `${exact(match[1] ?? '', language)}の制定を開始` : `开始制定${exact(match[1] ?? '', language)}`;
  match = source.match(/^Take (.+)$/);
  if (match) return language === 'ko' ? `${match[1]} 점령` : language === 'ja' ? `${match[1]}を獲得` : `夺取${match[1]}`;
  match = source.match(/^Open (.+)$/);
  if (match) return language === 'ko' ? `${match[1]} 열기` : language === 'ja' ? `${match[1]}を開く` : `打开${match[1]}`;
  match = source.match(/^Subject of (.+)$/);
  if (match) return language === 'ko' ? `${match[1]}의 종속국` : language === 'ja' ? `${match[1]}の従属国` : `${match[1]}的附属国`;
  match = source.match(/^Truce (\d+)w$/);
  if (match) return language === 'ko' ? `휴전 ${match[1]}주` : language === 'ja' ? `休戦 ${match[1]}週` : `停战 ${match[1]}周`;
  match = source.match(/^(\d+)w left$/);
  if (match) return language === 'ko' ? `${match[1]}주 남음` : language === 'ja' ? `残り${match[1]}週` : `剩余${match[1]}周`;
  match = source.match(/^(.+) exhaustion$/);
  if (match) return language === 'ko' ? `${exact(match[1] ?? '', language)} 전쟁 피로도` : language === 'ja' ? `${exact(match[1] ?? '', language)}の戦争疲弊` : `${exact(match[1] ?? '', language)}战争疲劳`;
  match = source.match(/^Raid (\d+)% · Escort (\d+)%$/);
  if (match) return language === 'ko' ? `습격 ${match[1]}% · 호위 ${match[2]}%` : language === 'ja' ? `襲撃 ${match[1]}% · 護衛 ${match[2]}%` : `袭击 ${match[1]}% · 护航 ${match[2]}%`;
  match = source.match(/^ skill (\d+) · (.+)$/);
  if (match) return language === 'ko' ? ` 기술 ${match[1]} · ${exact(match[2] ?? '', language)}` : language === 'ja' ? ` 技量 ${match[1]} · ${exact(match[2] ?? '', language)}` : ` 技能 ${match[1]} · ${exact(match[2] ?? '', language)}`;
  match = source.match(/^(.+) \((\d+) states\)$/);
  if (match) return `${match[1]} (${translateDynamic(`${match[2]} states`, language)})`;
  match = source.match(/^(.+) \((\d+) wk\)$/);
  if (match) return language === 'ko' ? `${match[1]} (${match[2]}주)` : language === 'ja' ? `${match[1]} (${match[2]}週)` : `${match[1]}（${match[2]}周）`;
  match = source.match(/^(\d+(?:\.\d+)?) points per week$/);
  if (match) return language === 'ko' ? `주당 ${match[1]} 연구점` : language === 'ja' ? `週${match[1]}研究点` : `每周${match[1]}研究点`;
  match = source.match(/^(.+) \/ week$/);
  if (match) return language === 'ko' ? `${match[1]} / 주` : language === 'ja' ? `${match[1]} / 週` : `${match[1]} / 周`;
  match = source.match(/^(.+) GDP per week$/);
  if (match) return language === 'ko' ? `주간 GDP ${match[1]}` : language === 'ja' ? `週GDP ${match[1]}` : `每周GDP ${match[1]}`;
  match = source.match(/^(.+) per week$/);
  if (match) return language === 'ko' ? `주당 ${match[1]}` : language === 'ja' ? `週あたり ${match[1]}` : `每周 ${match[1]}`;
  match = source.match(/^(.+) equipped( · mobilised)?$/);
  if (match) return language === 'ko' ? `장비율 ${match[1]}${match[2] ? ' · 동원됨' : ''}` : language === 'ja' ? `装備率 ${match[1]}${match[2] ? ' · 動員済み' : ''}` : `装备率 ${match[1]}${match[2] ? ' · 已动员' : ''}`;
  match = source.match(/^(\d+)\/(\d+) available \/ needed convoys$/);
  if (match) return language === 'ko' ? `수송선 가용/필요 ${match[1]}/${match[2]}` : language === 'ja' ? `輸送船 利用可能/必要 ${match[1]}/${match[2]}` : `运输船 可用/需要 ${match[1]}/${match[2]}`;
  match = source.match(/^(.+) intelligence summary$/);
  if (match) return language === 'ko' ? `${translateDynamic(match[1] ?? '', language)} 정보 요약` : language === 'ja' ? `${translateDynamic(match[1] ?? '', language)} 情報概要` : `${translateDynamic(match[1] ?? '', language)} 情报摘要`;

  match = source.match(/^(.+) per week leaves roughly (\d+) weeks of reserves\.$/);
  if (match) return language === 'ko' ? `주당 ${match[1]} 감소하며 약 ${match[2]}주분의 국고가 남았습니다.` : language === 'ja' ? `週${match[1]}減少し、国庫は約${match[2]}週分です。` : `每周减少${match[1]}，国库约可维持${match[2]}周。`;
  match = source.match(/^(.+) per week while the treasury is already below zero\.$/);
  if (match) return language === 'ko' ? `국고가 이미 적자인 상태에서 주당 ${match[1]} 감소하고 있습니다.` : language === 'ja' ? `国庫がすでに赤字の状態で週${match[1]}減少しています。` : `国库已为负数，且每周继续减少${match[1]}。`;
  match = source.match(/^(\d+(?:\.\d+)?) construction points per week are available for a new project\.$/);
  if (match) return language === 'ko' ? `새 건설에 주당 ${match[1]} 건설점을 사용할 수 있습니다.` : language === 'ja' ? `新規建設に週${match[1]}建設点を利用できます。` : `每周有${match[1]}建设点可用于新项目。`;
  match = source.match(/^(.+) demand met(?:, plus (\d+) more)?\.$/);
  if (match) {
    const goods = (match[1] ?? '').split(', ').map((item) => {
      const itemMatch = item.match(/^(.+) (\d+)%$/);
      return itemMatch ? `${exact(itemMatch[1] ?? '', language)} ${itemMatch[2]}%` : item;
    }).join(', ');
    const more = match[2]
      ? (language === 'ko' ? `, 그 외 ${match[2]}개` : language === 'ja' ? `、ほか${match[2]}品目` : `，另有${match[2]}项`)
      : '';
    return language === 'ko' ? `수요 충족률: ${goods}${more}.` : language === 'ja' ? `需要充足率：${goods}${more}。` : `需求满足率：${goods}${more}。`;
  }
  match = source.match(/^Legitimacy is (\d+)\/100, slowing effective government\.$/);
  if (match) return language === 'ko' ? `정통성이 ${match[1]}/100으로 정부 효율을 저해하고 있습니다.` : language === 'ja' ? `正統性は${match[1]}/100で、政府効率が低下しています。` : `合法性为${match[1]}/100，正在降低政府效率。`;
  match = source.match(/^(\d+(?:\.\d+)?) research points per week are waiting for a project\.$/);
  if (match) return language === 'ko' ? `주당 ${match[1]} 연구점을 사용할 연구를 선택하세요.` : language === 'ja' ? `週${match[1]}研究点を使う研究を選択してください。` : `请选择项目使用每周${match[1]}研究点。`;
  match = source.match(/^(.+) demand (.+) at (\d+) radicalism\.$/);
  if (match) return language === 'ko' ? `${exact(match[1] ?? '', language)}이(가) ${exact(match[2] ?? '', language)}을 요구하며 급진도는 ${match[3]}입니다.` : language === 'ja' ? `${exact(match[1] ?? '', language)}が${exact(match[2] ?? '', language)}を要求し、急進度は${match[3]}です。` : `${exact(match[1] ?? '', language)}要求${exact(match[2] ?? '', language)}，激进度为${match[3]}。`;
  match = source.match(/^(\d+) active wars? require immediate military attention\.$/);
  if (match) return language === 'ko' ? `${match[1]}개의 진행 중인 전쟁에 즉각적인 군사 대응이 필요합니다.` : language === 'ja' ? `${match[1]}件の戦争に直ちに軍事対応が必要です。` : `${match[1]}场进行中的战争需要立即处理。`;
  match = source.match(/^(\d+) wars? and (\d+) active land fronts?\.$/);
  if (match) return language === 'ko' ? `전쟁 ${match[1]}개, 활성 육상 전선 ${match[2]}개.` : language === 'ja' ? `戦争${match[1]}件、稼働中の陸上戦線${match[2]}本。` : `${match[1]}场战争，${match[2]}条活跃陆地战线。`;
  match = source.match(/^(\d+) diplomatic plays?; the nearest resolution is in (\d+) weeks?\.$/);
  if (match) return language === 'ko' ? `외교전 ${match[1]}개가 진행 중이며 가장 가까운 결론까지 ${match[2]}주 남았습니다.` : language === 'ja' ? `外交戦が${match[1]}件進行中で、最短${match[2]}週で決着します。` : `${match[1]}场外交博弈正在进行，最近将在${match[2]}周后解决。`;
  match = source.match(/^(\d+)% equipment coverage across (\d+) battalions\.$/);
  if (match) return language === 'ko' ? `${match[2]}개 대대의 장비 충족률이 ${match[1]}%입니다.` : language === 'ja' ? `${match[2]}個大隊の装備充足率は${match[1]}%です。` : `${match[2]}个营的装备覆盖率为${match[1]}%。`;
  match = source.match(/^(\d+) convoys are available for (\d+) needed; supply is (\d+)%\.$/);
  if (match) return language === 'ko' ? `필요 수송선 ${match[2]}척 중 ${match[1]}척을 사용할 수 있으며 보급률은 ${match[3]}%입니다.` : language === 'ja' ? `必要な輸送船${match[2]}隻のうち${match[1]}隻が利用可能で、補給率は${match[3]}%です。` : `需要${match[2]}艘运输船，现有${match[1]}艘可用，补给率为${match[3]}%。`;
  match = source.match(/^(\d+(?:\.\d+)?) of (\d+(?:\.\d+)?) influence can support alliances or improved relations\.$/);
  if (match) return language === 'ko' ? `외교력 ${match[2]} 중 ${match[1]}을 동맹이나 관계 개선에 사용할 수 있습니다.` : language === 'ja' ? `外交力${match[2]}のうち${match[1]}を同盟や関係改善に利用できます。` : `${match[2]}点外交影响力中有${match[1]}点可用于结盟或改善关系。`;

  match = source.match(/^Treasury (.+)$/);
  if (match) return `${exact('Treasury', language)} ${match[1]}`;
  match = source.match(/^(Income|Expenses|Net) (.+) \/ week$/);
  if (match) return language === 'ko' ? `${exact(match[1] ?? '', language)} ${match[2]} / 주` : language === 'ja' ? `${exact(match[1] ?? '', language)} ${match[2]} / 週` : `${exact(match[1] ?? '', language)} ${match[2]} / 周`;
  match = source.match(/^Government: (\d+) interest groups?$/);
  if (match) return language === 'ko' ? `정부: 이익 집단 ${match[1]}개` : language === 'ja' ? `政府：利益集団${match[1]}` : `政府：${match[1]}个利益集团`;
  match = source.match(/^(\d+) \/ (\d+) points$/);
  if (match) return `${match[1]} / ${match[2]}${language === 'ko' ? '점' : language === 'ja' ? '点' : '点'}`;
  match = source.match(/^Rank #(\d+)( — Great Power)?$/);
  if (match) return language === 'ko' ? `순위 #${match[1]}${match[2] ? ' — 열강' : ''}` : language === 'ja' ? `順位 #${match[1]}${match[2] ? ' — 列強' : ''}` : `排名 #${match[1]}${match[2] ? ' — 列强' : ''}`;
  match = source.match(/^Flotillas (\d+(?:\.\d+)?)$/);
  if (match) return language === 'ko' ? `전단 ${match[1]}` : language === 'ja' ? `小艦隊 ${match[1]}` : `分舰队 ${match[1]}`;
  match = source.match(/^Convoys (\d+) available, (\d+) needed \(supply (\d+)%\)$/);
  if (match) return language === 'ko' ? `수송선 가용 ${match[1]}, 필요 ${match[2]} (보급 ${match[3]}%)` : language === 'ja' ? `輸送船 利用可能${match[1]}、必要${match[2]}（補給${match[3]}%）` : `运输船 可用${match[1]}，需要${match[2]}（补给${match[3]}%）`;
  match = source.match(/^Diplomatic play against (.+) — (\d+) weeks left$/);
  if (match) return language === 'ko' ? `${match[1]} 상대 외교전 — ${match[2]}주 남음` : language === 'ja' ? `${match[1]}との外交戦 — 残り${match[2]}週` : `与${match[1]}的外交博弈 — 剩余${match[2]}周`;

  match = source.match(/^(\d+) of (\d+) jobs filled$/);
  if (match) return language === 'ko' ? `일자리 ${match[2]}개 중 ${match[1]}개 충원` : language === 'ja' ? `雇用枠${match[2]}のうち${match[1]}充足` : `${match[2]}个岗位中已填补${match[1]}个`;
  match = source.match(/^Revenue (.+) · Costs (.+)$/);
  if (match) return language === 'ko' ? `매출 ${match[1]} · 비용 ${match[2]}` : language === 'ja' ? `収益 ${match[1]} · 費用 ${match[2]}` : `收入 ${match[1]} · 成本 ${match[2]}`;
  match = source.match(/^(.+) production method$/);
  if (match) return language === 'ko' ? `${exact(match[1] ?? '', language)} 생산 방식` : language === 'ja' ? `${exact(match[1] ?? '', language)}の生産方式` : `${exact(match[1] ?? '', language)}生产方式`;
  match = source.match(/^Queue one level \((\d+) construction points\)$/);
  if (match) return language === 'ko' ? `1레벨 건설 대기열 추가 (${match[1]} 건설점)` : language === 'ja' ? `1レベルを建設キューに追加（建設点${match[1]}）` : `将1级加入建设队列（${match[1]}建设点）`;
  match = source.match(/^Members: (.+)$/);
  if (match) return language === 'ko' ? `구성원: ${match[1]}` : language === 'ja' ? `構成員：${match[1]}` : `成员：${match[1]}`;
  match = source.match(/^(.+) in government$/);
  if (match) return language === 'ko' ? `${exact(match[1] ?? '', language)} 정부 참여` : language === 'ja' ? `${exact(match[1] ?? '', language)}を政府に参加` : `${exact(match[1] ?? '', language)}加入政府`;

  match = source.match(/^Up to (\d+) goals\.$/);
  if (match) return language === 'ko' ? `목표는 최대 ${match[1]}개입니다.` : language === 'ja' ? `目標は最大${match[1]}件です。` : `最多${match[1]}个目标。`;
  match = source.match(/^Start a play with (\d+) goals?\.$/);
  if (match) return language === 'ko' ? `목표 ${match[1]}개로 외교전을 시작합니다.` : language === 'ja' ? `目標${match[1]}件で外交戦を開始します。` : `以${match[1]}个目标发起外交博弈。`;
  match = source.match(/^(.+) \/ (.+) used$/);
  if (match) return language === 'ko' ? `${match[1]} / ${match[2]} 사용` : language === 'ja' ? `${match[1]} / ${match[2]} 使用` : `${match[1]} / ${match[2]} 已使用`;
  match = source.match(/^Join (.+)$/);
  if (match) return language === 'ko' ? `${exact(match[1] ?? '', language)} 합류` : language === 'ja' ? `${exact(match[1] ?? '', language)}に参加` : `加入${exact(match[1] ?? '', language)}`;
  match = source.match(/^Support (.+)\.$/);
  if (match) return language === 'ko' ? `${match[1]}을 지원합니다.` : language === 'ja' ? `${match[1]}を支持します。` : `支持${match[1]}。`;
  match = source.match(/^(.+) humiliates (.+) \(prestige\)\.$/);
  if (match) return language === 'ko' ? `${match[1]}이(가) ${match[2]}에 굴욕을 주어 위신을 얻습니다.` : language === 'ja' ? `${match[1]}が${match[2]}を屈辱し、威信を得ます。` : `${match[1]}羞辱${match[2]}并获得威望。`;
  match = source.match(/^(.+) becomes a subject of (.+)\.$/);
  if (match) return language === 'ko' ? `${match[1]}이(가) ${match[2]}의 종속국이 됩니다.` : language === 'ja' ? `${match[1]}が${match[2]}の従属国になります。` : `${match[1]}成为${match[2]}的附属国。`;
  match = source.match(/^(.+) annexes (.+) from (.+)\.$/);
  if (match) return language === 'ko' ? `${match[1]}이(가) ${match[3]}로부터 ${match[2]}을(를) 합병합니다.` : language === 'ja' ? `${match[1]}が${match[3]}から${match[2]}を併合します。` : `${match[1]}从${match[3]}吞并${match[2]}。`;
  match = source.match(/^(.+): (.+)$/);
  if (match && ['Initiator', 'Target', 'Attackers', 'Defenders'].includes(match[1] ?? '')) return `${exact(match[1] ?? '', language)}: ${match[2]}`;
  match = source.match(/^(Att\.|Def\.) (won|lost)$/);
  if (match) return `${exact(match[1] ?? '', language)} ${exact(match[2] ?? '', language)}`;
  match = source.match(/^Landing · (.+)$/);
  if (match) return `${exact('Landing', language)} · ${match[1]}`;
  match = source.match(/^(\d+) weeks? of truce left\.$/);
  if (match) return language === 'ko' ? `휴전이 ${match[1]}주 남았습니다.` : language === 'ja' ? `休戦期間は残り${match[1]}週です。` : `停战期剩余${match[1]}周。`;
  match = source.match(/^A truce with this country lasts (\d+) more weeks\.$/);
  if (match) return language === 'ko' ? `이 국가와의 휴전이 ${match[1]}주 더 지속됩니다.` : language === 'ja' ? `この国家との休戦はあと${match[1]}週続きます。` : `与该国的停战还将持续${match[1]}周。`;
  match = source.match(/^You are already in a play against (.+)\.$/);
  if (match) return language === 'ko' ? `이미 ${match[1]}을(를) 상대로 외교전을 진행 중입니다.` : language === 'ja' ? `すでに${match[1]}との外交戦に参加しています。` : `已经在与${match[1]}进行外交博弈。`;

  return source;
}

export function translateText(source: string, language: Language): string {
  if (language === 'en' || source.length === 0) return source;
  const translatedLines = source.split('\n').map((line) => {
    const match = line.match(/^(\s*)(.*?)(\s*)$/);
    const leading = match?.[1] ?? '';
    const core = match?.[2] ?? line;
    const trailing = match?.[3] ?? '';
    if (!core) return line;
    const translated = exact(core, language);
    return `${leading}${translated === core ? translateDynamic(core, language) : translated}${trailing}`;
  });
  return translatedLines.join('\n');
}

interface CachedText {
  source: string;
  output: string;
}

const textCache = new WeakMap<Text, CachedText>();
const attributeCache = new WeakMap<Element, Map<string, CachedText>>();
const TRANSLATED_ATTRIBUTES = ['title', 'placeholder', 'aria-label'] as const;

/**
 * Translates a rendered DOM subtree while retaining the original English source for later
 * language switches. Nodes changed by a normal re-render are automatically treated as new source.
 */
export function translateTree(root: ParentNode, language: Language): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node as Text;
    const parent = text.parentElement;
    if (!parent?.closest('[data-i18n-skip]')) {
      const cached = textCache.get(text);
      const source = cached && text.data === cached.output ? cached.source : text.data;
      const output = translateText(source, language);
      if (text.data !== output) text.data = output;
      textCache.set(text, { source, output });
    }
    node = walker.nextNode();
  }

  const elements = root instanceof Element ? [root, ...root.querySelectorAll('*')] : [...root.querySelectorAll('*')];
  for (const element of elements) {
    if (element.closest('[data-i18n-skip]')) continue;
    let cache = attributeCache.get(element);
    if (!cache) {
      cache = new Map();
      attributeCache.set(element, cache);
    }
    for (const attribute of TRANSLATED_ATTRIBUTES) {
      const current = element.getAttribute(attribute);
      if (current === null) continue;
      const cached = cache.get(attribute);
      const source = cached && current === cached.output ? cached.source : current;
      const output = translateText(source, language);
      if (current !== output) element.setAttribute(attribute, output);
      cache.set(attribute, { source, output });
    }
  }
}
