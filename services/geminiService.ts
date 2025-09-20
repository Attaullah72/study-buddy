import { GoogleGenAI, Type } from "@google/genai";
import { EvaluationFeedback, Source } from "../types";

// Lazily initialize the AI client to prevent app crash on load if API key is missing.
let ai: GoogleGenAI | undefined;
const getAiClient = () => {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  }
  return ai;
}

const model = "gemini-2.5-flash";

export const generateStudyGuide = async (topic: string): Promise<{ guide: string; sources: Source[] }> => {
  try {
    const aiClient = getAiClient();
    const response = await aiClient.models.generateContent({
      model,
      contents: `Generate a concise and accurate study guide on the topic: "${topic}". The guide should be easy to understand for a beginner. Break it down into key concepts with brief explanations.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    const guide = response.text;
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

    const sources: Source[] = groundingChunks
      .map((chunk: any) => ({
        uri: chunk.web?.uri,
        title: chunk.web?.title,
      }))
      .filter((source: Source) => source.uri && source.title);

    // Deduplicate sources based on URI
    const uniqueSources = Array.from(new Map(sources.map(item => [item['uri'], item])).values());

    return { guide, sources: uniqueSources };
  } catch (error) {
    console.error("Error generating study guide:", error);
    throw new Error("Failed to generate study guide. Please try again.");
  }
};

export const generateQuizQuestion = async (
  studyGuide: string,
  previousQuestions: string[]
): Promise<string> => {
  try {
    const aiClient = getAiClient();
    const response = await aiClient.models.generateContent({
      model,
      contents: `Based on the following study guide, generate one quiz question.
      
      Study Guide:
      ---
      ${studyGuide}
      ---
      
      Do not repeat any of these previous questions:
      ${previousQuestions.join("\n- ")}
      
      Generate a new, unique question.`,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating quiz question:", error);
    throw new Error("Failed to generate a new question. Please try again.");
  }
};

const evaluationSchema = {
  type: Type.OBJECT,
  properties: {
    evaluation: {
      type: Type.STRING,
      description: "Evaluation of the answer. Must be one of: 'Correct', 'Incorrect', or 'Partially Correct'.",
    },
    explanation: {
      type: Type.STRING,
      description: "A brief explanation of why the answer is correct, incorrect, or partially correct.",
    },
  },
};

export const evaluateAnswer = async (
  studyGuide: string,
  question: string,
  answer: string
): Promise<EvaluationFeedback> => {
  try {
    const aiClient = getAiClient();
    const response = await aiClient.models.generateContent({
      model,
      contents: `Based on the study guide and the question, evaluate the user's answer.

      Study Guide:
      ---
      ${studyGuide}
      ---
      
      Question: ${question}
      User's Answer: ${answer}

      Provide your evaluation and a brief explanation.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: evaluationSchema,
      },
    });

    const jsonText = response.text.trim();
    const evaluation = JSON.parse(jsonText) as EvaluationFeedback;
    return evaluation;
  } catch (error) {
    console.error("Error evaluating answer:", error);
    throw new Error("Failed to evaluate the answer. Please try again.");
  }
};

export const generateKeyPoints = async (studyGuide: string): Promise<string> => {
  try {
    const aiClient = getAiClient();
    const response = await aiClient.models.generateContent({
      model,
      contents: `Based on the following study guide, extract the most important key points. Present them as a concise, easy-to-read bulleted list.

      Study Guide:
      ---
      ${studyGuide}
      ---
      `,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating key points:", error);
    throw new Error("Failed to generate key points. Please try again.");
  }
};

export const generateSummary = async (studyGuide: string): Promise<string> => {
  try {
    const aiClient = getAiClient();
    const response = await aiClient.models.generateContent({
      model,
      contents: `Summarize the following study guide in simple terms for a beginner. The summary should be a concise paragraph or two.

      Study Guide:
      ---
      ${studyGuide}
      ---
      `,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating summary:", error);
    throw new Error("Failed to generate summary. Please try again.");
  }
};