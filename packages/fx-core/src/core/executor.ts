// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  err,
  FxError,
  NodeType,
  ok,
  QTreeNode,
  Result,
  returnUserError,
  UserError,
  SingleSelectQuestion,
  ConfigFolderName,
  Inputs,
  SolutionContext,
  Void,
  EnvMeta,
  SolutionEnvContext,
  Task,
  SolutionAllContext,
  FunctionRouter,
  SolutionScaffoldResult,
  ResourceEnvResult,
  ProjectConfigs,
  Func,
  TeamsSolutionSetting,
  Json,
  StringValidation,
} from "fx-api";
import { hooks } from "@feathersjs/hooks";
import { writeConfigMW } from "./middlewares/config";
import { projectTypeCheckerMW } from "./middlewares/supportChecker";
import * as error from "./error";
import { CoreContext } from "./context";
import { DefaultSolution } from "../plugins/solution/default";
import { deepCopy, initFolder, mergeDict, replaceTemplateVariable } from "./tools";
import { AppNameQuestion, CoreQuestionNames, QuestionEnvLocal, QuestionEnvName, QuestionEnvSideLoading, QuestionSelectEnv, QuestionSelectSolution, RootFolderQuestion, SampleSelect, ScratchOptionNo, ScratchOptionYes, ScratchOrSampleSelect } from "./question";
import * as fs from "fs-extra";
import * as path from "path";
import * as jsonschema from "jsonschema";
import { QuestionMW } from "./middlewares/question";

export class Executor {

  @hooks([QuestionMW, writeConfigMW])
  static async createProject( ctx: CoreContext, inputs: Inputs ): Promise<Result<string, FxError>> {
    const appName = inputs[CoreQuestionNames.AppName] as string;
    const folder = inputs[CoreQuestionNames.Folder] as string;
    const projectPath = path.resolve(`${folder}/${appName}`);
    const folderExist = await fs.pathExists(projectPath);
    if (folderExist) {
      return err(
        new UserError(
          "ProjectFolderExist",
          `Project folder exsits:${projectPath}`,
          "Solution"
        )
      );
    }
    const validateResult = jsonschema.validate(appName, {
      pattern: (AppNameQuestion.validation as StringValidation).pattern,
    });
    if (validateResult.errors && validateResult.errors.length > 0) {
      return err(
        new UserError(
          "InvalidInput",
          `${validateResult.errors[0].message}`,
          "Solution"
        )
      );
    }
    ctx.projectPath = projectPath;
    ctx.projectSetting.name = appName;
    // get solution
    ctx.solution = new DefaultSolution();

    // build SolutionContext
    const solutionContext:SolutionContext = {
      ...ctx,
      solutionSetting: {
          name: ctx.solution.name, 
          version: "1.0.0",
          resources:[],
          resourceSettings:{}
      }
    };

    const initRes = await initFolder(ctx.projectPath, inputs.appName as string);
    if(initRes.isErr()) return err(initRes.error);
    
    // scaffold
    const scaffoldRes = await ctx.solution.scaffoldFiles(solutionContext, inputs);
    if(scaffoldRes.isErr()) return err(scaffoldRes.error);
    const templates:SolutionScaffoldResult = scaffoldRes.value;
    ctx.deployTemplates = templates.deployTemplates;
    ctx.provisionTemplates = templates.provisionTemplates;
    ctx.solutionContext = solutionContext;
    return ok(ctx.projectPath);
  }
   
  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async provisionResources(ctx: CoreContext, inputs: Inputs): Promise<Result<Void, FxError>> {
    const provisionConfigs = this.getProvisionConfigs(ctx);
    const solutionContext:SolutionEnvContext = this.createSolutionEnvContext(ctx, provisionConfigs);
    ctx.solutionContext = solutionContext;
    await new Promise(resolve => setTimeout(resolve, 5000));
    const res = await ctx.solution!.provisionResources(solutionContext, inputs);
    let result:ResourceEnvResult|undefined;
    if(res.isOk()){
      result = res.value;
    }
    else {
      result = res.error.result;
    }
    ctx.resourceInstanceValues = mergeDict(ctx.resourceInstanceValues, result.resourceValues);
    ctx.stateValues = mergeDict(ctx.stateValues, result.stateValues);
    return res.isOk() ? ok(Void) : err(res.error);
  }

  
  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async buildArtifacts(ctx: CoreContext, inputs: Inputs): Promise<Result<Void, FxError>> {
    const solutionContext:SolutionContext = this.createSolutionContext(ctx);
    ctx.solutionContext = solutionContext;
    const res = await ctx.solution!.buildArtifacts(solutionContext, inputs);
    if(res.isErr()) return err(res.error);
    return ok(Void);
  }

  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async deployArtifacts(ctx: CoreContext, inputs: Inputs): Promise<Result<Void, FxError>> {
    const deployConfigs = this.getDeployConfigs(ctx);
    const solutionContext:SolutionEnvContext = this.createSolutionEnvContext(ctx, deployConfigs);
    ctx.solutionContext = solutionContext;
    const res = await ctx.solution!.deployArtifacts(solutionContext, inputs);
    let result:ResourceEnvResult|undefined;
    if(res.isOk()){
      result = res.value;
    }
    else {
      result = res.error.result;
    }
    ctx.resourceInstanceValues = mergeDict(ctx.resourceInstanceValues, result.resourceValues);
    ctx.stateValues = mergeDict(ctx.stateValues, result.stateValues);
    return res.isOk() ? ok(Void) : err(res.error);
  }

  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async publishApplication(ctx: CoreContext, inputs: Inputs): Promise<Result<Void, FxError>> {
    const solutionContext:SolutionAllContext = this.createSolutionAllContext(ctx);
    ctx.solutionContext = solutionContext;
    const res = await ctx.solution!.publishApplication(solutionContext, inputs);
    if(res.isOk()){
      ctx.resourceInstanceValues = mergeDict(ctx.resourceInstanceValues, res.value.resourceValues);
      ctx.stateValues = mergeDict(ctx.stateValues, res.value.stateValues);
    }
    return res.isOk() ? ok(Void) : err(res.error);
  }

  @hooks([projectTypeCheckerMW])
  static async getQuestionsForLifecycleTask( ctx: CoreContext, task:Task, inputs: Inputs): Promise<Result<QTreeNode | undefined, FxError>> {
    const node = new QTreeNode({ type: NodeType.group });
    const solutionContext = this.createSolutionAllContext(ctx);
    ctx.solutionContext = solutionContext;
    if(task === Task.createEnv){
      node.addChild(new QTreeNode(QuestionEnvName));
      QuestionEnvName.validation = {
        validFunc : (input: string|string[]|undefined, previousInputs?: Inputs) : string | undefined | Promise<string | undefined> => {
          const envName = input as string;
          if(ctx.projectSetting.environments[envName])
            return `enviroment already exist!`;
          else 
            return undefined;
        }
      };
      node.addChild(new QTreeNode(QuestionEnvLocal));
      node.addChild(new QTreeNode(QuestionEnvSideLoading));
    }
    else if (task === Task.removeEnv || task === Task.switchEnv){
      node.addChild(new QTreeNode(QuestionSelectEnv));
    }
    else if (task === Task.create) {
      const scratchSelectNode = new QTreeNode(ScratchOrSampleSelect);
      node.addChild(scratchSelectNode);
      
      const scratchNode = new QTreeNode({type:NodeType.group});
      scratchNode.condition = {equals: ScratchOptionYes.id};
      scratchSelectNode.addChild(scratchNode);
      
      const sampleNode = new QTreeNode(SampleSelect);
      sampleNode.condition = {equals: ScratchOptionNo.id};
      scratchSelectNode.addChild(sampleNode);

      //make sure that global solutions are loaded
      const solutionNames: string[] = [];
      for (const k of ctx.globalSolutions.keys()) {
          solutionNames.push(k);
      }
      const selectSolution: SingleSelectQuestion = QuestionSelectSolution;
      selectSolution.staticOptions = solutionNames;
      const solutionSelectNode = new QTreeNode(selectSolution);
      scratchNode.addChild(solutionSelectNode);
      for (const [k, v] of ctx.globalSolutions) {
        const res = await v.getQuestionsForLifecycleTask(solutionContext, task, inputs);
        if (res.isErr()) return res;
        if(res.value){
            const solutionNode = res.value as QTreeNode;
            solutionNode.condition = { equals: k };
            if (solutionNode.data) solutionSelectNode.addChild(solutionNode);
        }
      }
      scratchNode.addChild(new QTreeNode(RootFolderQuestion));
      scratchNode.addChild(new QTreeNode(AppNameQuestion));
      sampleNode.addChild(new QTreeNode(RootFolderQuestion));
    } else if (ctx.solution) {
      const res = await ctx.solution.getQuestionsForLifecycleTask(solutionContext, task, inputs);
      if (res.isErr()) return res;
      if (res.value) {
        const child = res.value as QTreeNode;
        if (child.data) node.addChild(child);
      }
    } 
    return ok(node);
  }

  @hooks([projectTypeCheckerMW])
  static async getQuestionsForUserTask( ctx: CoreContext, router:FunctionRouter, inputs: Inputs): Promise<Result<QTreeNode | undefined, FxError>> {
    const namespace = router.namespace;
    const array = namespace ? namespace.split("/") : [];
    if (namespace && "" !== namespace && array.length > 0) {
      const solutionName = array[0];
      const solution = ctx.globalSolutions.get(solutionName);
      if (solution && solution.getQuestionsForUserTask) {
        const solutionContext = this.createSolutionAllContext(ctx);
        ctx.solutionContext = solutionContext;
        return await solution.getQuestionsForUserTask(solutionContext, router, inputs);
      }
    }
    return err(
      returnUserError(
        new Error(`getQuestionsForUserTaskRouteFailed:${JSON.stringify(router)}`),
        error.CoreSource,
        error.CoreErrorNames.getQuestionsForUserTaskRouteFailed
      )
    );
  }


  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async executeUserTask( ctx: CoreContext,  func: Func, inputs: Inputs ): Promise<Result<unknown, FxError>> {
    const namespace = func.namespace;
    const array = namespace ? namespace.split("/") : [];
    if ("" !== namespace && array.length > 0) {
      const solutionName = array[0];
      const solution = ctx.globalSolutions.get(solutionName);
      if (solution && solution.executeUserTask) {
        const solutionContext = this.createSolutionAllContext(ctx);
        ctx.solutionContext = solutionContext;
        return await solution.executeUserTask(solutionContext, func, inputs);
      }
    }
    return err(
      returnUserError(
        new Error(`executeUserTaskRouteFailed:${JSON.stringify(func)}`),
        error.CoreSource,
        error.CoreErrorNames.executeUserTaskRouteFailed
      )
    );
  }

  @hooks([projectTypeCheckerMW])
  static async getProjectConfigs( ctx: CoreContext, inputs: Inputs ): Promise<Result<ProjectConfigs, FxError>> {
    let configs:ProjectConfigs = {
      projectSetting: ctx.projectSetting,
      projectState: ctx.projectState,
      provisionTemplates: ctx.provisionTemplates,
      deployTemplates: ctx.deployTemplates,
      provisionConfigs: this.getProvisionConfigs(ctx),
      deployConfigs: this.getDeployConfigs(ctx),
      resourceInstanceValues: ctx.resourceInstanceValues,
      stateValues: ctx.stateValues
    };
    configs = deepCopy(configs);
    return ok(configs);
  }
  
  
  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async createEnv(ctx: CoreContext, inputs: Inputs): Promise<Result<Void, FxError>> {
    const EnvName = inputs[CoreQuestionNames.EnvName] as string;
    const EnvLocal = inputs[CoreQuestionNames.EnvLocal] as string;
    const EnvSideLoading = inputs[CoreQuestionNames.EnvSideLoading] as string;
    const env:EnvMeta= {name:EnvName, local: EnvLocal === "true", sideloading: EnvSideLoading === "true"};
    const existing = ctx.projectSetting.environments[env.name];
    if(!existing){
      ctx.projectSetting.environments[env.name] = env;
      return ok(Void);
    }
    return err(new UserError("EnvExist", "EnvExist", "core"));
  }

  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async removeEnv( ctx: CoreContext, inputs: Inputs): Promise<Result<Void, FxError>> {
    const EnvName = inputs[CoreQuestionNames.EnvName] as string;
    if(EnvName === ctx.projectSetting.currentEnv)
      return err(new UserError("RemoveEnvFail", "current environment can not be removed!", "core"));
    const existing = ctx.projectSetting.environments[EnvName];
    if(existing){
      delete ctx.projectSetting.environments[EnvName];
      ctx.resourceInstanceValues = undefined;
      return ok(Void);
    }
    return err(new UserError("EnvNotExist", "EnvNotExist", "core"));
  }

  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async switchEnv( ctx: CoreContext, inputs: Inputs): Promise<Result<Void, FxError>> {
    const EnvName = inputs[CoreQuestionNames.EnvName] as string;
    const existing = ctx.projectSetting.environments[EnvName];
    if(existing){
      const file = `${ctx.projectPath}/.${ConfigFolderName}/${EnvName}.userdata`;
      ctx.resourceInstanceValues = (await fs.pathExists(file)) ? await fs.readJSON(file) : {};
      ctx.projectSetting.currentEnv = EnvName;
      return ok(Void);
    }
    return err(new UserError("EnvNotExist", "EnvNotExist", "core"));
  }

  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async listEnvs(ctx: CoreContext, inputs: Inputs): Promise<Result<EnvMeta[], FxError>> {
    const list:EnvMeta[] = [];
    for(const k of Object.keys(ctx.projectSetting.environments)){
      const envMeta = ctx.projectSetting.environments[k];
      list.push(envMeta);
    }
    return ok(list);
  }
 

  static getProvisionConfigs(ctx: CoreContext):Record<string,Json>{
    const resources = ((ctx.projectSetting.solutionSetting)as TeamsSolutionSetting).activeResourcePlugins;
    const provisionConfigs: Record<string,Json> = {};
    if(resources){
      for(const resource of resources){
        if(ctx.provisionTemplates){
          const resourceTemplate = ctx.provisionTemplates[resource];
          if(resourceTemplate){
            replaceTemplateVariable(resourceTemplate, ctx.resourceInstanceValues);
            provisionConfigs[resource] = resourceTemplate;
          }
        }
      }
    }
    return provisionConfigs;
  }

  static getDeployConfigs(ctx: CoreContext):Record<string,Json>{
    const resources = ((ctx.projectSetting.solutionSetting)as TeamsSolutionSetting).activeResourcePlugins;
    const deployConfigs: Record<string,Json> = {};
    if(resources){
      for(const resource of resources){
        if(ctx.deployTemplates){
          const resourceTemplate = ctx.deployTemplates[resource];
          if(resourceTemplate){
            replaceTemplateVariable(resourceTemplate, ctx.resourceInstanceValues);
            deployConfigs[resource] = resourceTemplate;
          }
        }
      }
    }
    return deployConfigs;
  }
 
  static createSolutionContext(ctx: CoreContext):SolutionContext{
    const solutionContext:SolutionContext = {
      projectPath: ctx.projectPath,
      userInterface: ctx.userInterface,
      logProvider: ctx.logProvider,
      telemetryReporter: ctx.telemetryReporter,
      projectSetting: ctx.projectSetting,
      projectState: ctx.projectState,
      solutionSetting: ctx.projectSetting.solutionSetting
    };
    return solutionContext;
  }

  static createSolutionEnvContext(ctx: CoreContext, resourceConfigs: Record<string,Json>):SolutionEnvContext{
    const envMeta = ctx.projectSetting.environments[ctx.projectSetting.currentEnv];
    const solutionContext:SolutionEnvContext = {
      ...this.createSolutionContext(ctx),
      env: envMeta,
      tokenProvider: ctx.tokenProvider,
      resourceConfigs: resourceConfigs
    };
    return solutionContext;
  }

  static createSolutionAllContext(ctx: CoreContext):SolutionAllContext{
    // build SolutionAllContext
    const provisionConfigs = this.getProvisionConfigs(ctx);
    const deployConfigs = this.getDeployConfigs(ctx);
    const envMeta = ctx.projectSetting.environments[ctx.projectSetting.currentEnv];
    const solutionContext:SolutionAllContext = {
      ...this.createSolutionContext(ctx),
      env: envMeta,
      tokenProvider: ctx.tokenProvider,
      provisionConfigs: provisionConfigs,
      deployConfigs: deployConfigs
    };
    return solutionContext;
  }
  
}



