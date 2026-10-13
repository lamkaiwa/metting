export const seeds=[
 {id:1,name:'Chloe',age:27,gender:'女',area:'中西區',place:'上環',intent:'輕鬆約會',bio:'一杯自然酒，一段沒有劇本的對話。',tags:['自然酒','藝術展','夜遊'],color:'#d9b49a',shirt:'#f2e6d5',hair:'#322e28',style:1,available:true,mutual:true},
 {id:2,name:'Ryan',age:29,gender:'男',area:'油尖旺',place:'尖沙咀',intent:'開放探索',bio:'日落、黑膠，還有聊不完的電影。',tags:['黑膠','電影','咖啡'],color:'#bcc6b0',shirt:'#374d42',hair:'#302e29',style:2,available:true,mutual:false},
 {id:3,name:'Mika',age:26,gender:'女',area:'灣仔',place:'銅鑼灣',intent:'輕鬆約會',bio:'不趕時間，想認識有趣的你。',tags:['攝影','散步','Live 音樂'],color:'#b4c5c3',shirt:'#333e40',hair:'#352e2a',style:3,available:false,mutual:true},
 {id:4,name:'Alex',age:31,gender:'男',area:'中西區',place:'中環',intent:'認真發展',bio:'週末行山，平日尋找好吃的小店。',tags:['行山','料理','建築'],color:'#d8c6a6',shirt:'#9eae96',hair:'#352f2a',style:4,available:false,mutual:true},
 {id:5,name:'Yuki',age:28,gender:'女',area:'九龍城',place:'啟德',intent:'開放探索',bio:'喜歡真誠，也喜歡一點即興。',tags:['設計','海邊','甜點'],color:'#c3baa6',shirt:'#b06a54',hair:'#292c28',style:5,available:true,mutual:true},
 {id:6,name:'Sean',age:30,gender:'男',area:'東區',place:'太古',intent:'輕鬆約會',bio:'找個人，一起探索城市的另一面。',tags:['跑步','調酒','旅行'],color:'#b1b9ac',shirt:'#e5d5bc',hair:'#443c31',style:6,available:true,mutual:false}
];
seeds.forEach(p=>{p.agentId=[1,3,5].includes(p.id)?"harbor":"city";p.status="published";p.point=({1:[22.29,114.15],2:[22.30,114.17],3:[22.28,114.19],4:[22.28,114.16],5:[22.33,114.20],6:[22.28,114.22]})[p.id]});
