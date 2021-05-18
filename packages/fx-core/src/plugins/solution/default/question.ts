// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.


import {
  FolderQuestion,
  FuncQuestion,
  Inputs,
  MultiSelectQuestion,
  NodeType,
  ok,
  OptionItem,
  returnSystemError,
  SingleSelectQuestion,
  StaticOptions,
  TextInputQuestion,
  Void,
} from "fx-api";

export enum SolutionQuestionNames {

  Capabilities = "capabilities",
  TabScopes = "tab-scopes",
  HostType = "host-type",
  AzureResources = "azure-resources",
  PluginSelectionDeploy = "deploy-plugin",
  AddResources = "add-azure-resources",
  AskSub = "subscription",
  ProgrammingLanguage = "programming-language",
}

export const TabOptionItem: OptionItem = {
  id: "Tab",
  label: "Tab",
  cliName: "tab",
  description: "UI-based app",
  detail: "Tabs are Teams-aware webpages embedded in Microsoft Teams.",
};

export const BotOptionItem: OptionItem = {
  id: "Bot",
  label: "Bot",
  cliName: "bot",
  description: "Conversational Agent",
  detail:
    "Bots allow users to interfact with your web service through text, interactive cards, and task modules.",
};

export const MessageExtensionItem: OptionItem = {
  id: "MessagingExtension",
  label: "Messaging Extension",
  cliName: "messaging-extension",
  description: "Custom UI when users compose messages in Teams",
  detail:
    "Messaging Extensions allow users to interact with your web service through buttons and forms in the Microsoft Teams client.",
};

export const HostTypeOptionAzure: OptionItem = {
  id: "Azure",
  label: "Azure",
  cliName: "azure",
};

export const HostTypeOptionSPFx: OptionItem = {
  id: "SPFx",
  label: "SharePoint Framework (SPFx)",
  cliName: "spfx",
};

export const AzureResourceSQL: OptionItem = {
  id: "sql",
  label: "Azure SQL Database",
};

export const AzureResourceFunction: OptionItem = {
  id: "function",
  label: "Azure Function App",
};

export const AzureResourceApim: OptionItem = {
  id: "apim",
  label: "Register APIs in Azure API Management",
};


export const CapabilitiesQuestion:MultiSelectQuestion = {
  name: SolutionQuestionNames.Capabilities,
  title: "Select capabilities",
  type: NodeType.multiSelect,
  staticOptions: [TabOptionItem, BotOptionItem, MessageExtensionItem],
  default: [TabOptionItem.id],
  placeholder: "Select at least 1 capability",
  validation: { minItems: 1 },
};

export const FrontendHostTypeQuestion: SingleSelectQuestion = {
  name: SolutionQuestionNames.HostType,
  title: "Frontend hosting type",
  type: NodeType.singleSelect,
  staticOptions: [HostTypeOptionAzure, HostTypeOptionSPFx],
  dynamicOptions: (inputs: Inputs) : StaticOptions => {
    const cap = inputs[SolutionQuestionNames.Capabilities] as string[];
    if (cap) {
      if (cap.includes(BotOptionItem.id) || cap.includes(MessageExtensionItem.id))
        return [HostTypeOptionAzure];
      if (cap.includes(TabOptionItem.id)) return [HostTypeOptionAzure, HostTypeOptionSPFx];
      return [];
    }
    throw returnSystemError(
      new Error("Capabilities is undefined"),
      "Solution",
      "InternelError"
    );
  },
  default: HostTypeOptionAzure.id,
  placeholder: "Select a hosting type",
  skipSingleOption: true,
};



export const AzureResourcesQuestion: MultiSelectQuestion = {
  name: SolutionQuestionNames.AzureResources,
  title: "Cloud resources",
  type: NodeType.multiSelect,
  staticOptions: [AzureResourceSQL, AzureResourceFunction],
  default: [],
  onDidChangeSelection: async (
    current: Set<string>,
    previous: Set<string>
  ): Promise<Set<string>> => {
    const hasSQL = current.has(AzureResourceSQL.id);
    if (hasSQL) {
      current.add(AzureResourceFunction.id);
    }
    return current;
  },
  placeholder: "Select a resource (optional)",
};

export function createAddAzureResourceQuestion(
  alreadyHaveFunction: boolean,
  alreadhHaveSQL: boolean,
  alreadyHaveAPIM: boolean
): MultiSelectQuestion {
  const options: OptionItem[] = [AzureResourceFunction];
  if (!alreadhHaveSQL) options.push(AzureResourceSQL);
  if (!alreadyHaveAPIM) options.push(AzureResourceApim);
  return {
    name: SolutionQuestionNames.AddResources,
    title: "Cloud resources",
    type: NodeType.multiSelect,
    staticOptions: options,
    default: [],
    onDidChangeSelection: async (
      current: Set<string>,
      previous: Set<string>
    ): Promise<Set<string>> => {
      const hasSQL = current.has(AzureResourceSQL.id);
      const hasAPIM = current.has(AzureResourceApim.id);
      if ((hasSQL || hasAPIM) && !alreadyHaveFunction) {
        current.add(AzureResourceFunction.id);
      }
      return current;
    },
  };
}

export function addCapabilityQuestion(
  alreadyHaveTab: boolean,
  alreadyHaveBot: boolean
): MultiSelectQuestion {
  const options: OptionItem[] = [];
  if (!alreadyHaveTab) options.push(TabOptionItem);
  if (!alreadyHaveBot) {
    options.push(BotOptionItem);
    options.push(MessageExtensionItem);
  }
  return {
    name: SolutionQuestionNames.Capabilities,
    title: "Choose capabilities",
    type: NodeType.multiSelect,
    staticOptions: options,
    default: [],
  };
}

export const DeployPluginSelectQuestion: MultiSelectQuestion = {
  name: SolutionQuestionNames.PluginSelectionDeploy,
  title: `Select resources`,
  type: NodeType.multiSelect,
  skipSingleOption: true,
  staticOptions: [],
  default: [],
};

export const AskSubscriptionQuestion: FuncQuestion = {
  name: SolutionQuestionNames.AskSub,
  type: NodeType.func,
  func: async function(input:Inputs): Promise<unknown>{
    return Void;
  }
};

export const ProgrammingLanguageQuestion: SingleSelectQuestion = {
  name: SolutionQuestionNames.ProgrammingLanguage,
  title: "Programming Language",
  type: NodeType.singleSelect,
  staticOptions:  [
    { id: "javascript", label: "JavaScript" },
    { id: "typescript", label: "TypeScript" },
  ],
  dynamicOptions: (input:Inputs) : StaticOptions => {
    const hostType = input[SolutionQuestionNames.HostType] as string;
    if (HostTypeOptionSPFx.id === hostType) return [{ id: "typescript", label: "TypeScript" }];
    return [
      { id: "javascript", label: "JavaScript" },
      { id: "typescript", label: "TypeScript" },
    ];
  },
  default: "javascript",
  placeholder: (input:Inputs): string | undefined => {
    const hostType = input[SolutionQuestionNames.HostType] as string;
    if (HostTypeOptionSPFx.id === hostType) return "SPFx is currently supporting TypeScript only.";
    return undefined;
  },
};