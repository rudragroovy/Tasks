const API_URL = 'http://localhost:5000/api';

async function run() {
  const email = 'test_ai_' + Date.now() + '@example.com';
  const regRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ name: 'Bob', email, password: 'pw', role: 'PATIENT' })
  });
  const token = (await regRes.json()).token;

  console.log("Prompt: 'I have a very bad headache and chest pain for 3 days.'");
  const aiRes = await fetch(`${API_URL}/ai/symptoms`, {
    method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + token},
    body: JSON.stringify({ text: 'I have a very bad headache and chest pain for 3 days.' })
  });
  const data1 = await aiRes.json();
  console.log("AI Answer 1:");
  console.log(data1);

  console.log("\nPrompt: 'I have chest pain for 3 days. My pain level is 8/10. I have a history of high blood pressure. I currently take lisinopril.'");
  const aiRes2 = await fetch(`${API_URL}/ai/symptoms`, {
    method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + token},
    body: JSON.stringify({ text: 'I have chest pain for 3 days. My pain level is 8/10. I have a history of high blood pressure. I currently take lisinopril.' })
  });
  const data2 = await aiRes2.json();
  console.log("AI Answer 2:");
  console.log(data2);
}

run();
