// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
  
import { Result } from "neverthrow"; 
import {  Context, EnvMeta, FunctionRouter, FxError, Inputs, QTreeNode, Task, TokenProvider, Void, ResourceEnvResult, Func, Json } from "./index";


export interface ResourceContext extends Context {
    resourceSettings: Json;
    resourceStates: Json;
}

export interface ResourceScaffoldResult{
    provision:Json;
    deploy:Json
}


export interface ResourceEnvContext  extends ResourceContext {
    envMeta: EnvMeta;
    tokenProvider: TokenProvider;  
    commonConfig: Json;
    selfConfig: Json;
}

export interface ResourceConfigureContext extends ResourceEnvContext
{
    allProvisionConfigs: Record<string, Json>;
}
 

export interface ResourceAllContext  extends ResourceContext {
    envMeta: EnvMeta;
    tokenProvider: TokenProvider;  
    provisionConfig?: Json;
    deployConfig?: Json;
}

export interface ResourcePublishContext  extends ResourceContext {
    envMeta: EnvMeta;
    tokenProvider: TokenProvider;  
    manifest: Json;
}

 
export interface ResourcePlugin {

    name:string,

    displayName:string,
 
    scaffoldSourceCode?: (ctx: ResourceContext, inputs: Inputs) => Promise<Result<Void, FxError>>;  
 
    scaffoldResourceTemplate?: (ctx: ResourceContext, inputs: Inputs) => Promise<Result<ResourceScaffoldResult, FxError>>; 
     
    provisionResource?: (ctx: ResourceEnvContext, inputs: Inputs) => Promise<Result<ResourceEnvResult, FxError>>;
 
    configureResource?: (ctx: ResourceConfigureContext) => Promise<Result<Void, FxError>>;

    buildArtifacts?: (ctx: ResourceContext, inputs: Inputs) => Promise<Result<Void, FxError>>;

    deployArtifacts?: (ctx: ResourceEnvContext, inputs: Inputs) => Promise<Result<ResourceEnvResult, FxError>>;

    publishApplication?: (ctx: ResourcePublishContext, inputs: Inputs) => Promise<Result<ResourceEnvResult, FxError>>;
   
    /**
     * get question model for lifecycle {@link Task} (create, provision, deploy, publish), Questions are organized as a tree. Please check {@link QTreeNode}.
     */
    getQuestionsForLifecycleTask?: (ctx: ResourceAllContext, task: Task, inputs: Inputs) => Promise<Result<QTreeNode|undefined, FxError>>;

    /**
     * get question model for plugin customized {@link Task}, Questions are organized as a tree. Please check {@link QTreeNode}.
     */
    getQuestionsForUserTask?: (ctx: ResourceAllContext, router: FunctionRouter, inputs: Inputs) => Promise<Result<QTreeNode | undefined, FxError>>;

    /**
     * execute user customized task, for example `Add Resource`, `Add Capabilities`, etc
     */
     executeUserTask?: (ctx: ResourceAllContext, func:Func, inputs: Inputs) => Promise<Result<unknown, FxError>>;
}
