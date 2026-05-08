import { Router } from "express";

import { aiRouter } from "./modules/ai.routes.js";
import { answerRouter } from "./modules/answers.routes.js";
import { authRouter } from "./modules/auth.routes.js";
import { commentRouter } from "./modules/comments.routes.js";
import { notificationRouter } from "./modules/notifications.routes.js";
import { questionRouter } from "./modules/questions.routes.js";
import { voteRouter } from "./modules/votes.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/questions", questionRouter);
apiRouter.use("/questions", answerRouter);
apiRouter.use("/comments", commentRouter);
apiRouter.use("/notifications", notificationRouter);
apiRouter.use("/votes", voteRouter);
apiRouter.use("/ai", aiRouter);
