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
  TeamsSolutionSetting,
  SystemError,
  err,
} from "fx-api";
import {
  AzureResourceApim,
  AzureResourceFunction,
  AzureResourceSQL,
  AzureResourcesQuestion,
  BotOptionItem,
  CapabilitiesQuestion,
  FrontendHostTypeQuestion,
  HostTypeOptionAzure,
  MessageExtensionItem,
  ProgrammingLanguageQuestion,
  SolutionQuestionNames,
  TabOptionItem,
} from "./question";

export class DefaultSolution implements SolutionPlugin {
  name = "fx-solution-default";
  displayName = "Default Solution";
  async scaffoldFiles(
    ctx: SolutionContext,
    inputs: Inputs
  ): Promise<Result<SolutionScaffoldResult, FxError>> {
    const solutionSettingRes = this.fillInSolutionSettings(ctx, inputs);
    if(solutionSettingRes.isErr()) return err(solutionSettingRes.error);
    const solutionSetting = solutionSettingRes.value;
    solutionSetting.activeResourcePlugins = ["fx-resource-frontend"];
    ctx.solutionSetting = solutionSetting;
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
  fillInSolutionSettings(ctx: SolutionContext, inputs: Inputs): Result<TeamsSolutionSetting, FxError> {
    const projectSetting = ctx.projectSetting;
    const capabilities = inputs[SolutionQuestionNames.Capabilities] as string[] || [];
    if (!capabilities || capabilities.length === 0) {
      return err( new SystemError("InvalidInput", "Invalid capabilities", "Solution"));
    }
    let hostType = inputs[SolutionQuestionNames.HostType] as string;
    if (capabilities.includes(BotOptionItem.id) || capabilities.includes(MessageExtensionItem.id))
      hostType = HostTypeOptionAzure.id;
    if (!hostType) {
      return err(new SystemError("InvalidInput", "Invalid host-type", "Solution"));
    }
    let azureResources: string[] | undefined;
    if (hostType === HostTypeOptionAzure.id && capabilities.includes(TabOptionItem.id)) {
      azureResources = inputs[SolutionQuestionNames.AzureResources] as string[];
      if (azureResources) {
        if (
          (azureResources.includes(AzureResourceSQL.id) ||
            azureResources.includes(AzureResourceApim.id)) &&
          !azureResources.includes(AzureResourceFunction.id)
        ) {
          azureResources.push(AzureResourceFunction.id);
        }
      } else azureResources = [];
    }
    const solutionSetting: TeamsSolutionSetting = {
      name: projectSetting.solutionSetting.name,
      version: projectSetting.solutionSetting.version,
      hostType: hostType,
      capabilities: capabilities,
      azureResources: azureResources || [],
      activeResourcePlugins: [],
      resourceSettings:{}
    };
    projectSetting.solutionSetting = solutionSetting;
    return ok(solutionSetting);
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
