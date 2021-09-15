import {
    AfterContentInit,
    AfterViewInit,
    Component,
    OnInit,
    ViewChild,
} from '@angular/core';
import { exportPipeline } from '../../models/pipeline-export.model';
import { PipelineNode, pipelineNodeInfo, PipelineNodeType } from '../../models/pipeline-node.model';
import {
    Pipeline,
} from '../../models/pipeline.model';
import { DiagramComponent } from '../diagram/diagram.component';

@Component({
    selector: 'app-pipeline',
    templateUrl: './designer.component.html',
    styleUrls: ['./designer.component.scss'],
})
export class DesignerComponent
    implements OnInit, AfterViewInit, AfterContentInit
{
    pipeline = new Pipeline(-1, 'سناریو جدید');
    selectedNode?: PipelineNode;
    @ViewChild('diagram') diagram!: DiagramComponent;

    pipelineNodeInfo = pipelineNodeInfo;
    PipelineNodeType = PipelineNodeType;

    constructor() {}

    ngOnInit(): void {}

    ngAfterContentInit(): void {
        const personalId = this.pipeline.createNode(
            'ثبت احوال',
            PipelineNodeType.datasetInput,
            { x: 3, y: 5 }
        );

        const vipId = this.pipeline.createNode(
            'اشخاص مهم',
            PipelineNodeType.filter,
            { x: 10, y: 4 },
            [personalId]
        );

        this.pipeline.createNode(
            'CIA',
            PipelineNodeType.datasetOutput,
            { x: 20, y: 5 },
            [vipId]
        );

        this.pipeline.loaded.next();
    }

    ngAfterViewInit(): void {}

    exportPipeline() {
        this.pipeline.reorder();
        console.log(JSON.stringify(exportPipeline(this.pipeline), null, 4));
    }
}