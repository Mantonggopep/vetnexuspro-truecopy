
import { Patient, Vitals } from '../types';

const getHeaders = () => {
  const token = localStorage.getItem('vet_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export const summarizeMedicalHistory = async (patient: Patient): Promise<string> => {
  try {
    const text = `
      Patient: ${patient.name} (${patient.species} - ${patient.breed})
      Age: ${patient.age}, Sex: ${patient.sex}
      History:
      ${patient.notes.map(n => `- [${new Date(n.date).toLocaleDateString()}] ${n.content}`).join('\n')}
    `;

    const res = await fetch('/api/ai/summary', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text })
    });

    if (!res.ok) throw new Error("Failed to generate summary");
    const data = await res.json();
    return data.summary;
  } catch (error) {
    console.error(error);
    return "AI Summary unavailable.";
  }
};

export const generateDiagnosisSuggestion = async (
  species: string, 
  age: string, 
  subjective: string, 
  objective: string, 
  vitals?: Vitals,
  country: string = 'United States'
): Promise<string> => {
  try {
    const payload = { species, age, subjective, objective, vitals, country };
    const res = await fetch('/api/ai/diagnosis', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Failed to generate diagnosis");
    const data = await res.json();
    return data.result;
  } catch (error) {
    console.error(error);
    return "[]";
  }
};

export const identifyProductFromImage = async (base64Image: string): Promise<any> => {
  try {
    const res = await fetch('/api/ai/identify', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ image: base64Image })
    });

    if (!res.ok) throw new Error("Failed to identify product");
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
};
