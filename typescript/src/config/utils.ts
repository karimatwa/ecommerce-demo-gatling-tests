import { getParameter } from "@gatling.io/core";
import targetEnvResolver from "./targetEnvResolver";

export const targetEnv = getParameter("targetEnv", "PROD");
export const users = parseInt(getParameter("users", "1"));

export const duration = parseInt(getParameter("durationMinutes", "1"));
export const ramp_duration = parseInt(getParameter("rampDurationMinutes", "1"));

export const testType = getParameter("testType", "smoke");

export const frPerc = parseFloat(getParameter("frPerc", "60.0"));
export const usPerc = parseFloat(getParameter("usPerc", "40.0"));

export const frDelay = parseInt(getParameter("frDelay", "0"));
export const usDelay = parseInt(getParameter("usDelay", "0"));

export const minPauseSec = parseInt(getParameter("minPauseSec", "5"));
export const maxPauseSec = parseInt(getParameter("maxPauseSec", "15"));

const targetObj = targetEnvResolver(targetEnv);
export const pageUrl = targetObj.pageUrl;
export const baseUrl = targetObj.baseUrl;
