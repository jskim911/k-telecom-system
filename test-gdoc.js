const { gdocEngine } = require('./src/lib/gdoc_engine');

async function testAnalysis() {
  const docId = '1rPZP5fKYsUE2NEmmBM7CmdS6OVMhlgcBW8eDkog5b_I';
  console.log(`📡 테스트 시작: ${docId}`);
  
  try {
    const result = await gdocEngine.analyzeTemplate(docId);
    console.log('✅ 분석 성공!');
    console.log('결과:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ 분석 실패 상세 내역:');
    if (error.response) {
      console.error('상태 코드:', error.response.status);
      console.error('데이터:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('메시지:', error.message);
      console.error('스택:', error.stack);
    }
  }
}

testAnalysis();
