import { Router } from "express";
import { saveBracket } from "../controllers/bracketController.ts";

const bracketRoutes = Router();

bracketRoutes.post("/api/v1/bracket/save", saveBracket);

export default bracketRoutes;
