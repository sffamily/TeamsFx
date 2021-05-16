// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Context,
  Json,
  SolutionContext,
  SolutionPlugin,
  TokenProvider,
} from "fx-api";

export interface CoreContext extends Context {
  globalSolutions: Map<string, SolutionPlugin>;

  solution?: SolutionPlugin;

  provisionTemplates?: Record<string, Json>;

  deployTemplates?: Record<string, Json>;

  resourceInstanceValues?: Json;

  stateValues?: Json;

  tokenProvider: TokenProvider;

  solutionContext?: SolutionContext;
}
