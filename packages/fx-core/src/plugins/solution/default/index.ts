// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FunctionRouter,
  FxError,
  Inputs,
  ok,
  QTreeNode,
  Result,
  SolutionAllContext,
  SolutionContext,
  SolutionEnvContext,
  SolutionPlugin,
  Task,
  Void,
  ResourceEnvResult,
  Func,
  NodeType,
  SolutionScaffoldResult,
  err,
  UserError,
  StringValidation,
} from "fx-api";
import {
  AppNameQuestion,
  AzureResourcesQuestion,
  CapabilitiesQuestion,
  FrontendHostTypeQuestion,
  HostTypeOptionAzure,
  ProgrammingLanguageQuestion,
  RootFolderQuestion,
  SolutionQuestionNames,
  TabOptionItem,
} from "./question";
import * as path from "path";
import * as fs from "fs-extra";
import * as jsonschema from "jsonschema";
export class DefaultSolution implements SolutionPlugin {
  name = "fx-solution-default";
  displayName = "Default Solution";
  async scaffoldFiles(
    ctx: SolutionContext,
    inputs: Inputs
  ): Promise<Result<SolutionScaffoldResult, FxError>> {
    const appName = inputs[SolutionQuestionNames.AppName] as string;
    const folder = inputs[SolutionQuestionNames.Folder] as string;
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
    ctx.solutionSetting.resources = ["fx-resource-frontend"];
    return ok({
      provisionTemplates: {
        "fx-resource-frontend": {
          endpoint: "{{endpoint}}",
        },
      },
      deployTemplates: {
        "fx-resource-frontend": {
          storagename: "{{storagename}}",
        },
      },
    });
  }
  async buildArtifacts(
    ctx: SolutionContext,
    inputs: Inputs
  ): Promise<Result<Void, FxError>> {
    ctx.projectState.build = true;
    return ok(Void);
  }
  async provisionResources(
    ctx: SolutionEnvContext,
    inputs: Inputs
  ): Promise<
    Result<ResourceEnvResult, FxError & { result: ResourceEnvResult }>
  > {
    ctx.logProvider.info(
      `[solution] provision resource configs: ${JSON.stringify(
        ctx.resourceConfigs
      )}`
    );
    return ok({
      resourceValues: {
        endpoint: "http://oowww.com",
      },
      stateValues: {
        provision: true,
      },
    });
  }
  async deployArtifacts(
    ctx: SolutionEnvContext,
    inputs: Inputs
  ): Promise<
    Result<ResourceEnvResult, FxError & { result: ResourceEnvResult }>
  > {
    ctx.logProvider.info(
      `[solution] deploy resource configs: ${JSON.stringify(
        ctx.resourceConfigs
      )}`
    );
    return ok({
      resourceValues: {
        storagename: "mystorage",
      },
      stateValues: {
        deploy: true,
      },
    });
  }
  async publishApplication(
    ctx: SolutionAllContext,
    inputs: Inputs
  ): Promise<Result<ResourceEnvResult, FxError>> {
    ctx.logProvider.info(
      `[solution] publish provisionConfigs: ${JSON.stringify(
        ctx.provisionConfigs
      )}`
    );
    ctx.logProvider.info(
      `[solution] publish deployConfigs: ${JSON.stringify(ctx.deployConfigs)}`
    );
    ctx.projectState.publish = true;
    return ok({ resourceValues: {}, stateValues: {} });
  }

  async getTabScaffoldQuestions(
    ctx: SolutionContext,
    addAzureResource: boolean
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const tabNode = new QTreeNode({ type: NodeType.group });

    // //Frontend plugin
    // if (this.fehostPlugin.getQuestions) {
    //   const pluginCtx = getPluginContext(ctx, this.fehostPlugin.name);
    //   const res = await this.fehostPlugin.getQuestions(Stage.create, pluginCtx);
    //   if (res.isErr()) return res;
    //   if (res.value) {
    //     const frontendNode = res.value as QTreeNode;
    //     if (frontendNode.data) tabNode.addChild(frontendNode);
    //   }
    // }

    if (addAzureResource) {
      const azureResourceNode = new QTreeNode(AzureResourcesQuestion);
      tabNode.addChild(azureResourceNode);

      // //Azure Function
      // if (this.functionPlugin.getQuestions) {
      //   const pluginCtx = getPluginContext(ctx, this.functionPlugin.name);
      //   const res = await this.functionPlugin.getQuestions(Stage.create, pluginCtx);
      //   if (res.isErr()) return res;
      //   if (res.value) {
      //     const azure_function = res.value as QTreeNode;
      //     azure_function.condition = { minItems: 1 };
      //     if (azure_function.data) azureResourceNode.addChild(azure_function);
      //   }
      // }

      // //Azure SQL
      // if (this.sqlPlugin.getQuestions) {
      //   const pluginCtx = getPluginContext(ctx, this.sqlPlugin.name);
      //   const res = await this.sqlPlugin.getQuestions(Stage.create, pluginCtx);
      //   if (res.isErr()) return res;
      //   if (res.value) {
      //     const azure_sql = res.value as QTreeNode;
      //     azure_sql.condition = { contains: AzureResourceSQL.id };
      //     if (azure_sql.data) azureResourceNode.addChild(azure_sql);
      //   }
      // }
    }
    return ok(tabNode);
  }

  async getQuestionsForLifecycleTask(
    ctx: SolutionAllContext,
    task: Task,
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    if (task === Task.create) {
      const node = new QTreeNode({ type: NodeType.group });
      // 1. capabilities
      const capQuestion = CapabilitiesQuestion;
      const capNode = new QTreeNode(capQuestion);
      node.addChild(capNode);

      // 1.1 hostType
      const hostTypeNode = new QTreeNode(FrontendHostTypeQuestion);
      hostTypeNode.condition = { contains: TabOptionItem.id };
      capNode.addChild(hostTypeNode);

      // // 1.1.1 SPFX Tab
      // if (this.spfxPlugin.getQuestions) {
      //   const pluginCtx = getPluginContext(ctx, this.spfxPlugin.name);
      //   const res = await this.spfxPlugin.getQuestions(Stage.create, pluginCtx);
      //   if (res.isErr()) return res;
      //   if (res.value) {
      //     const spfxNode = res.value as QTreeNode;
      //     spfxNode.condition = { equals: HostTypeOptionSPFx.id };
      //     if (spfxNode.data) hostTypeNode.addChild(spfxNode);
      //   }
      // }

      // 1.1.2 Azure Tab
      const tabRes = await this.getTabScaffoldQuestions(ctx, true);
      if (tabRes.isErr()) return tabRes;
      if (tabRes.value) {
        const tabNode = tabRes.value;
        tabNode.condition = { equals: HostTypeOptionAzure.id };
        hostTypeNode.addChild(tabNode);
      }

      // // 1.2 Bot
      // if (this.botPlugin.getQuestions) {
      //   const pluginCtx = getPluginContext(ctx, this.botPlugin.name);
      //   const res = await this.botPlugin.getQuestions(stage, pluginCtx);
      //   if (res.isErr()) return res;
      //   if (res.value) {
      //     const botGroup = res.value as QTreeNode;
      //     botGroup.condition = {
      //       containsAny: [BotOptionItem.id, MessageExtensionItem.id],
      //     };
      //     capNode.addChild(botGroup);
      //   }
      // }

      // 1.3 Language
      const programmingLanguage = new QTreeNode(ProgrammingLanguageQuestion);
      programmingLanguage.condition = { minItems: 1 };
      capNode.addChild(programmingLanguage);

      // 1.4
      capNode.addChild(new QTreeNode(RootFolderQuestion));

      //1.5
      capNode.addChild(new QTreeNode(AppNameQuestion));

      return ok(node);
    }
    return ok(undefined);
  }

  async getQuestionsForUserTask(
    ctx: SolutionAllContext,
    router: FunctionRouter,
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return ok(undefined);
  }
  async executeUserTask(
    ctx: SolutionAllContext,
    func: Func,
    inputs: Inputs
  ): Promise<Result<unknown, FxError>> {
    return ok(Void);
  }
}
