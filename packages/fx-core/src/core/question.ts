// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  ConfigMap,
  FileQuestion,
  NodeType,
  OptionItem,
  SingleSelectQuestion,
  TextInputQuestion,
} from "@microsoft/teamsfx-api";
import * as jsonschema from "jsonschema";
import * as path from "path";
import * as fs from "fs-extra";

export enum CoreQuestionNames {
  AppName = "app-name",
  Foler = "folder",
  Solution = "solution",
  CreateFromScratch = "scratch",
  Samples = "samples",
  Stage = "stage",
  SubStage = "substage",
}

export const ProjectNamePattern = "^[a-zA-Z][\\da-zA-Z]+$";

export const QuestionAppName: TextInputQuestion = {
  type: NodeType.text,
  name: CoreQuestionNames.AppName,
  title: "Application name",
  validation: {
    validFunc: async (appName: string, answer?: ConfigMap): Promise<string | undefined> => {
      const folder = answer?.getString(CoreQuestionNames.Foler);
      if (!folder) return undefined;
      const schema = {
        pattern: ProjectNamePattern,
      };
      const validateResult = jsonschema.validate(appName, schema);
      if (validateResult.errors && validateResult.errors.length > 0) {
        return "Application name must start with a letter and can only contain letters and digits.";
      }
      const projectPath = path.resolve(folder, appName);
      const exists = await fs.pathExists(projectPath);
      if (exists)
        return `Path exists: ${projectPath}. Select a different application name.`;
      return undefined;
    },
  },
  placeholder: "Application name",
};

export const QuestionRootFolder: FileQuestion = {
  type: NodeType.folder,
  name: CoreQuestionNames.Foler,
  title: "Workspace folder",
  validation: {
    required: true,
  },
};

export const QuestionSelectSolution: SingleSelectQuestion = {
  type: NodeType.singleSelect,
  name: CoreQuestionNames.Solution,
  title: "Select a solution",
  option: [],
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
  detail: "Use an existing sample as a starting point for your new application.",
};

export const ScratchOrSampleSelect: SingleSelectQuestion = {
  type: NodeType.singleSelect,
  name: CoreQuestionNames.CreateFromScratch,
  title: "Teams Toolkit: Create a new Teams app",
  option: [ScratchOptionYes, ScratchOptionNo],
  default: ScratchOptionYes.id,
  placeholder: "Select an option",
  skipSingleOption: true,
};

export const SampleSelect: SingleSelectQuestion = {
  type: NodeType.singleSelect,
  name: CoreQuestionNames.Samples,
  title: "Start from a sample",
  option: [
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
