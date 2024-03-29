import {Component, Inject, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {HttpClient} from "@angular/common/http";
import {Subscription} from "rxjs";
import {NewLocalDataset} from "../../models/dataset.model";
import {DatasetService} from "../../services/dataset.service";

@Component({
  selector: 'app-dataset',
  templateUrl: './dataset.component.html',
  styleUrls: ['./dataset.component.scss']
})
export class DatasetComponent implements OnInit {

  form!: FormGroup;
  fileName!:string;
  file!: File;
  fileString!: string;
  uploadSubscription!: Subscription;
  loading: boolean = false; // Flag check loading
  name: string = '';
  rowSelected= '\\n';
  filedSelected= ',';

  constructor(private http: HttpClient, public datasetService: DatasetService,
              private formBuilder: FormBuilder,
              public dialogRef: MatDialogRef<DatasetComponent>,
              @Inject(MAT_DIALOG_DATA) public data: any
  ) {
  }

  ngOnInit() {
    this.form = this.formBuilder.group({
      name: [null, [Validators.required]],
      csvFile: [''],
      autoMap: [false, Validators.required],
      doesHaveHeader: [false, Validators.required]
    });
  }

  close() {
    if (this.uploadSubscription)
      this.uploadSubscription.unsubscribe();
    this.dialogRef.close();
  }

  async onFileChange(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.fileName = file.name;
      this.file = file;
      const text = await file.text();
      this.fileString = text;
      this.form.patchValue({
        csvFile: text
      });
    }
  }

  onUpload() {

    this.loading = !this.loading;

    const data: NewLocalDataset = {
      ...this.form.value, ...{
        fieldSeparator: this.filedSelected,
        rowSeparator: this.rowSelected
      }
    };
    console.log(data);
    this.uploadSubscription = this.datasetService.createLocal(data).subscribe(
      (event: any) => {
        this.loading = false;
      }
      , error => {
        alert('خطایی رخ داد لطفا مجددا تلاش کنید');
        this.loading = false;
      }, () => {
        this.dialogRef.close(this.form.value);
      }
    );
  }
}
