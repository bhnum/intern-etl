import { moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ReplaySubject, Subject } from 'rxjs';
import { InputConfig, JoinType, OutputConfig } from './config.model';

export enum PipelineNodeType {
    datasetInput = 'dataset_input',
    datasetOutput = 'dataset_output',
    select = 'select',
    filter = 'filter',
    sort = 'sort',
    join = 'join',
    aggregate = 'aggregate',
}

export interface PipelineNodeInfo {
    type: PipelineNodeType;
    title: string;
    altTitle: string;
    numInputs: number;
    hasOutput: boolean;
    iconName: string;
    iconMirrored: boolean;
}

export const pipelineNodeInfo: {
    [type in PipelineNodeType]: PipelineNodeInfo;
} = {
    [PipelineNodeType.datasetInput]: {
        type: PipelineNodeType.datasetInput,
        title: 'دیتاست ورودی',
        altTitle: '',
        numInputs: 0,
        hasOutput: true,
        iconName: 'file_download',
        iconMirrored: false,
    },
    [PipelineNodeType.datasetOutput]: {
        type: PipelineNodeType.datasetOutput,
        title: 'دیتاست خروجی',
        altTitle: '',
        numInputs: 1,
        hasOutput: false,
        iconName: 'publish',
        iconMirrored: false,
    },
    [PipelineNodeType.select]: {
        type: PipelineNodeType.select,
        title: 'انتخاب',
        altTitle: 'Select',
        numInputs: 1,
        hasOutput: true,
        iconName: 'edit',
        iconMirrored: false,
    },
    [PipelineNodeType.sort]: {
        type: PipelineNodeType.sort,
        title: 'مرتب‌سازی',
        altTitle: 'Sort',
        numInputs: 1,
        hasOutput: true,
        iconName: 'sort_by_alpha',
        iconMirrored: false,
    },
    [PipelineNodeType.filter]: {
        type: PipelineNodeType.filter,
        title: 'فیلتر',
        altTitle: 'Filter',
        numInputs: 1,
        hasOutput: true,
        iconName: 'filter_alt',
        iconMirrored: false,
    },
    [PipelineNodeType.join]: {
        type: PipelineNodeType.join,
        title: 'الحاق',
        altTitle: 'Join',
        numInputs: 1,
        hasOutput: true,
        iconName: 'merge_type',
        iconMirrored: false,
    },
    [PipelineNodeType.aggregate]: {
        type: PipelineNodeType.aggregate,
        title: 'تجمیع',
        altTitle: 'Aggregate',
        numInputs: 1,
        hasOutput: true,
        iconName: 'stacked_bar_chart',
        iconMirrored: true,
    },
};

export interface PipelineNode {
    id: number;
    name: string;
    type: PipelineNodeType;
    inputs: (number | null)[];
    position: { x: number; y: number };
    config: object;
}

export function initializePipelineNodeConfig(type: PipelineNodeType): object {
    switch (type) {
        case PipelineNodeType.datasetInput:
            return {
                datasetId: undefined,
            };
        case PipelineNodeType.datasetOutput:
            return {
                datasetId: undefined,
            };
        case PipelineNodeType.select:
            return {};
        case PipelineNodeType.filter:
            return {
                condition: '',
            };
        case PipelineNodeType.sort:
            return {
                orders: [],
            };
        case PipelineNodeType.join:
            return {
                type: JoinType.inner,
                joinWith: undefined,
                leftTableKey: '',
                rightTableKey: '',
            };
        case PipelineNodeType.aggregate:
            return {
                groupBy: [],
                operations: [],
            };
    }
}

export class Pipeline {
    nodes: PipelineNode[] = [];

    nodeAdded = new Subject<PipelineNode>();
    nodeEdited = new Subject<PipelineNode>();
    nodeRemoved = new Subject<PipelineNode>();
    loaded = new ReplaySubject<void>(1);

    constructor(public id: number, public name: string) {}

    getNode(id: number): { index: number; node: PipelineNode } | undefined {
        const index = this.nodes.findIndex((node) => node.id === id);
        if (index < 0) return;
        return { index: index, node: this.nodes[index] };
    }

    addNode(node: PipelineNode) {
        if (this.getNode(node.id) !== undefined)
            throw new Error(
                'a node with the same id already exists in the pipeline'
            );

        this.nodes.push(node);
        this.nodeAdded.next(node);
    }

    createNode(
        name: string,
        type: PipelineNodeType,
        position = { x: 0, y: 0 },
        inputs?: (number | null)[]
    ) {
        if (inputs !== undefined) {
            if (inputs.length !== pipelineNodeInfo[type].numInputs)
                throw new Error('invalid number of inputs');
        } else {
            inputs = new Array(pipelineNodeInfo[type].numInputs).fill(null);
        }

        const node: PipelineNode = {
            id: this.nextId,
            name: name,
            type: type,
            inputs: inputs,
            position: position,
            config: initializePipelineNodeConfig(type),
        };

        this.addNode(node);
        return node.id;
    }

    private get nextId() {
        return Math.max(0, ...this.nodes.map((node) => node.id + 1));
    }

    editNode(edited: PipelineNode) {
        const index = this.getNode(edited.id)?.index;

        if (index === undefined)
            throw new Error(
                'a node with the given id does not exist in the pipeline'
            );

        this.nodes[index] = edited;
        this.nodeEdited.next(edited);
    }

    markNodeAsEdited(id: number) {
        const node = this.getNode(id)?.node;

        if (node === undefined)
            throw new Error(
                'a node with the given id does not exist in the pipeline'
            );

        this.nodeEdited.next(node);
    }

    removeNode(id: number) {
        const index = this.nodes.findIndex((existing) => existing.id === id);

        if (index < 0)
            throw new Error(
                'a node with the given id does not exist in the pipeline'
            );

        this.nodes.forEach((node) => {
            let edited = false;
            for (let i = 0; i < node.inputs.length; i++) {
                if (node.inputs[i] === id) {
                    node.inputs[i] = null;
                    edited = true;
                }
            }
            if (edited) this.nodeEdited.next(node);
        });

        const node = this.nodes.splice(index, 1)[0];
        this.nodeRemoved.next(node);
    }

    reorder() {
        const validDeps: number[] = [];

        for (let i = 0; i < this.nodes.length; i++) {
            let success = false;
            let j = i;
            for (; j < this.nodes.length; j++) {
                const depsMet = this.nodes[j].inputs.every((depId) =>
                    depId === null ? true : validDeps.includes(depId)
                );

                if (depsMet) {
                    success = true;
                    break;
                }
            }
            if (!success) throw new Error('the pipeline is cyclic!');

            validDeps.push(this.nodes[j].id);
            moveItemInArray(this.nodes, j, i);
        }
    }
}