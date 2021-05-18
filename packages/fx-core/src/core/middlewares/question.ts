// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import {
  err,
  Inputs,
  FxError,
  QTreeNode,
  Result,
  Task,
  ok,
  InputResult,
  traverse,
  InputResultType,
  UserError,
} from "fx-api";
import { CoreContext } from "../context";
import { Executor } from "../executor";

/**
 * This middleware will help to collect input from question flow
 */
export const QuestionMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const inputs: Inputs = ctx.arguments[ctx.arguments.length - 1];
  const coreCtx: CoreContext = ctx.arguments[0] as CoreContext;
  const method = ctx.method;

  let getQuestionRes: Result<QTreeNode | undefined, FxError> = ok(undefined);
  if (method === "createProject")
    getQuestionRes = await Executor.getQuestionsForLifecycleTask(
      coreCtx,
      Task.create,
      inputs
    );
  else if (method === "provisionResources")
    getQuestionRes = await Executor.getQuestionsForLifecycleTask(
      coreCtx,
      Task.provision,
      inputs
    );

  if (getQuestionRes.isErr()) {
    ctx.result = err(getQuestionRes.error);
    return;
  }

  const node = getQuestionRes.value;
  if (node) {
    const res: InputResult = await traverse(node, inputs, coreCtx.userInterface);
    if (res.type === InputResultType.error) {
      ctx.result = err(res.error!);
      return;
    } else if (res.type === InputResultType.cancel) {
      ctx.result = err(new UserError("UserCancel", "UserCancel", "Core"));
      return;
    }
  }

  await next();
};
