// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  FolderQuestion,
  Inputs,
  NodeType,
  OptionItem,
  SingleSelectQuestion,
  StaticOptions,
  TextInputQuestion,
} from "fx-api";

export enum CoreQuestionNames {
  Solution = "solution",
  CreateFromScratch = "scratch",
  Samples = "samples",
  EnvName = "env-name",
  EnvLocal = "env-local",
  EnvSideLoading = "env-sideloading",
  Folder = "folder",
}

export const QuestionSelectSolution: SingleSelectQuestion = {
  type: NodeType.singleSelect,
  name: CoreQuestionNames.Solution,
  title: "Select a solution",
  staticOptions: ["fx-solution-default"],
  skipSingleOption: true,
};

export const ScratchOptionYes: OptionItem = {
  id: "yes",
  label: "$(new-folder) Create a new Teams app",
  detail: "Use the Teams Toolkit to create a new application.",
};

export const ScratchOptionNo: OptionItem = {
  id: "no",
  label: "$(heart) Start from a sample",
  detail:
    "Use an existing sample as a starting point for your new application.",
};

export const ScratchOrSampleSelect: SingleSelectQuestion = {
  type: NodeType.singleSelect,
  name: CoreQuestionNames.CreateFromScratch,
  title: "Teams Toolkit: Create a new Teams app",
  staticOptions: [ScratchOptionYes, ScratchOptionNo],
  default: ScratchOptionYes.id,
  placeholder: "Select an option",
  skipSingleOption: true,
};

export const SampleSelect: SingleSelectQuestion = {
  type: NodeType.singleSelect,
  name: CoreQuestionNames.Samples,
  title: "Start from a sample",
  staticOptions: [
    {
      id: "in-meeting-app",
      label: "In-meeting App",
      detail:
        "In-meeting app is a hello-world template which shows how to build an app working in the context of a Teams meeting. ",
      data: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip",
    },
    {
      id: "todo-list-with-Azure-backend",
      label: "Todo List with backend on Azure",
      detail: "Todo List provides easy way to manage to-do items in Teams Client.",
      data: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip",
    },
    {
      id: "todo-list-SPFx",
      label: "Todo List with SPFx",
      detail:
        "Todo List with SPFx is a Todo List for individual user to manage his/her personal to-do items in the format of an app installed on Teams client.",
      data: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip",
    },
    {
      id: "share-now",
      label: "Share Now",
      detail:
        "The Share Now promotes the exchange of information between colleagues by enabling users to share content within the Teams environment. ",
      data: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip",
    },
    {
      id: "faq-plus",
      label: "FAQ Plus",
      detail:
        "FAQ Plus is a conversational Q&A bot providing an easy way to answer frequently asked questions by users. ",
      data: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip",
    },
  ],
  placeholder: "Select a sample",
  returnObject: true,
};

export const QuestionEnvName: TextInputQuestion = {
  type: NodeType.text,
  name: CoreQuestionNames.EnvName,
  title: "Environment Name",
  default: "myenv",
};

export const QuestionEnvLocal: SingleSelectQuestion = {
  type: NodeType.singleSelect,
  name: CoreQuestionNames.EnvLocal,
  title: "Environment Is Local?",
  staticOptions: ["true", "false"],
};

export const QuestionEnvSideLoading: SingleSelectQuestion = {
  type: NodeType.singleSelect,
  name: CoreQuestionNames.EnvSideLoading,
  title: "Environment sideloading?",
  staticOptions: ["true", "false"],
};

export const QuestionSelectEnv: SingleSelectQuestion = {
  type: NodeType.singleSelect,
  name: CoreQuestionNames.EnvName,
  title: "Select an environment",
  staticOptions: ["default"],
  dynamicOptions: async (inputs: Inputs): Promise<StaticOptions> => {
    return ["default"];
  },
};

export const QuestionRootFolder: FolderQuestion = {
  type: NodeType.folder,
  name: CoreQuestionNames.Folder,
  title: "Workspace folder",
};
