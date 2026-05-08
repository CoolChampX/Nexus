import { explainCode } from "../services/ai.service.js";

export const explainCodeSnippet = async (req, res) => {
  const result = await explainCode(req.body);
  res.json(result);
};
