import type { RunOptions } from "../src/types";

export interface AssertFileData {
  name?: string;
  content?: string;
}

export interface AssertRequest extends Record<string, unknown> {
  files?: {
    jsSpec?: AssertFileData;
    tsSpec?: AssertFileData;
  };
}

export interface Config {
  options: RunOptions;
  assert?: AssertRequest;
  os?: "Linux" | "Windows" | "MacOS";
  env?: {
    APPDATA?: string;
    FIG_API_TOKEN?: string;
    XDG_DATA_HOME?: string;
    HOME?: string;
  };
}
