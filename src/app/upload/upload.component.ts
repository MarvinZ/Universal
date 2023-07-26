import { Component } from '@angular/core';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {
  data: any[] =[];
  headers: string[] = [];
  columns: { name: string, prop: string }[] = [];  // Initialize columns as an empty array
  resultHeaders = ["UPC", "COST", "ITEM NAME", "ITEM CODE", "SIZE/ TYPE/ VARIATION", "CASE PACK"];
  selectedColumns: string[] = [];



  onFileChange(evt: any) {
    const target: DataTransfer = <DataTransfer>(evt.target);
    if (target.files.length !== 1) throw new Error('Cannot use multiple files');

    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      /* read workbook */
      const bstr: string = e.target.result;
      const workbook: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

      /* grab first sheet */
      const worksheetName: string = workbook.SheetNames[0];
      const worksheet: XLSX.WorkSheet = workbook.Sheets[worksheetName];

      /* save data and headers */
      let json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      /* Detect where actual headers start */
      while (json.length && !this.isValidHeader(json[0])) {
        json.shift();
      }

      this.headers = json.length ? json.shift() as string[] : [];
      if (this.headers.length > 0) {
        this.columns = this.headers.filter(header => header !== null && header !== undefined)
        .map(header => ({ name: header, prop: header }));
      }

      /* transform rows into objects */
      this.data = json.map(row => {
        let rowData: { [key: string]: any } = {};
        this.headers.forEach((header, i) => {
          if (header && i < row.length) {
            rowData[header] = row[i];
          }
        });
        return rowData;
      });

      /* log headers and data */
      console.log('Headers:', this.headers);
      console.log('Data:', this.data);
    };

    reader.readAsBinaryString(target.files[0]);
  }



  isValidHeader(row: any[]): boolean {
    /* Define criteria for what constitutes a valid header row */
    let nonEmptyCellCount = row.reduce((count, cell) =>
      (cell !== null && cell !== undefined && typeof cell === 'string' && cell.trim() !== '') ? count + 1 : count
    , 0);
    return nonEmptyCellCount >= 2;  // Adjust this number based on your actual data
  }







  download() {
    /* Create a new workbook and worksheet */
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.selectedData());

    /* Add the worksheet to the workbook */
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    /* Write the workbook to a file and trigger download */
    XLSX.writeFile(wb, 'output.xlsx');
  }

  selectedData() {
    return this.data.map(row => {
      let selectedRow: { [key: string]: any } = {};
      this.resultHeaders.forEach((header, i) => {
        selectedRow[header] = row[this.selectedColumns[i]];
      });
      return selectedRow;
    });
  }



}