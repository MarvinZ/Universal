import { Component } from '@angular/core';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css'],
})
export class UploadComponent {
  data: any[] = [];
  headers: string[] = [];
  columns: { name: string; prop: string }[] = []; // Initialize columns as an empty array
  resultHeaders = [
    'UPC',
    'COST',
    'ITEM NAME',
    'ITEM CODE',
    'SIZE/ TYPE/ VARIATION',
    'CASE PACK',
    'MAP'
  ];
  selectedColumns: string[][] = this.resultHeaders.map(() => ['', '']);
  selectedDataObj: { [key: string]: any }[] = []; // Initialize as an empty array
  selectedColumnsObj: { name: string; prop: string }[] = [];
  shouldConcatenate: boolean[] = [];
  operationChoice: string[] = Array(this.resultHeaders.length).fill('none');


  constructor() {
    this.selectedColumnsObj = this.resultHeaders.map(header => ({ name: header, prop: header }));
    this.shouldConcatenate = new Array(this.resultHeaders.length).fill(false);
}


  onFileChange(evt: any) {
    const target: DataTransfer = <DataTransfer>evt.target;
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

        this.headers = json.length ? (json.shift() as string[]) : [];
        if (this.headers.length > 0) {
            this.columns = this.headers
                .filter((header) => header !== null && header !== undefined)
                .map((header) => ({ name: header, prop: header }));
        }

        // Auto-select columns if names match (case-insensitive)
        this.selectedColumns = this.resultHeaders.map((resultHeader) => [
            this.headers.find((header) => header.toLowerCase() === resultHeader.toLowerCase()) || '',
            '' // The second column for potential concatenation
        ]);

        /* transform rows into objects */
        this.data = json.map((row) => {
            let rowData: { [key: string]: any } = {};
            this.headers.forEach((header, i) => {
                if (header && i < row.length) {
                    rowData[header] = row[i];
                }
            });
            return rowData;
        });

        /* Update selectedData based on selectedColumns */
        this.updateSelectedData();

        /* log headers and data */
        console.log('Headers:', this.headers);
        console.log('Data:', this.data);
        console.log('Selected Data:', this.selectedDataObj);
    };

    reader.readAsBinaryString(target.files[0]);
}


  private isValidHeader(row: any[]): boolean {
    const nonEmptyCells = row.filter(
      (cell) => cell !== null && cell !== undefined && cell !== ''
    );
    const threshold = 5; // Adjust this value as needed
    return nonEmptyCells.length >= threshold;
  }

  updateSelectedData() {
    this.selectedDataObj = this.data.map(row => {
        let selectedRow: { [key: string]: any } = {};
        this.resultHeaders.forEach((resultHeader, i) => {
            let value1 = this.selectedColumns[i][0] ? row[this.selectedColumns[i][0]] : null;
            let value2 = this.selectedColumns[i][1] ? row[this.selectedColumns[i][1]] : null;

            if (resultHeader === 'UPC') {
                value1 = this.cleanUPCValue(value1);
                value2 = this.cleanUPCValue(value2);
            }

            if(this.operationChoice[i] === 'none') {
                selectedRow[resultHeader] = [value1, value2].join(' ').trim();
            } else {
                const num1 = parseFloat(value1);
                const num2 = parseFloat(value2);

                switch (this.operationChoice[i]) {
                    case 'add':
                        selectedRow[resultHeader] = num1 + num2;
                        break;
                    case 'subtract':
                        selectedRow[resultHeader] = num1 - num2;
                        break;
                    case 'multiply':
                        selectedRow[resultHeader] = num1 * num2;
                        break;
                    case 'divide':
                        if(num2 !== 0) {
                            selectedRow[resultHeader] = num1 / num2;
                        } else {
                            selectedRow[resultHeader] = 'N/A';  // or Infinity, depending on your preference
                        }
                        break;
                    case 'concatenate':
                        selectedRow[resultHeader] = [value1, value2].join(' ').trim();
                        break;
                    default:
                        selectedRow[resultHeader] = 'ERROR';
                        break;
                }
            }
        });
        return selectedRow;
    });
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
    return this.data.map((row) => {
        let selectedRow: { [key: string]: any } = {};
        this.resultHeaders.forEach((header, i) => {
            const selectedCols = this.selectedColumns[i];
            if (this.shouldConcatenate[i] && selectedCols[1]) {
                const firstColValue = row[selectedCols[0]] || '';
                const secondColValue = row[selectedCols[1]] || '';
                selectedRow[header] = `${firstColValue} ${secondColValue}`.trim();
            } else {
                selectedRow[header] = row[selectedCols[0]];
            }
        });
        return selectedRow;
    });
}



  addResultHeader() {
    const newHeader = prompt('Please enter the new column name:');
    if (newHeader) {
      this.resultHeaders.push(newHeader);
      this.selectedColumnsObj.push({ name: newHeader, prop: newHeader });
    }
  }

  cleanUPCValue(value: any): string {
    if (typeof value !== 'string') {
      value = String(value); // Convert non-string value to string
    }
    return value.replace(/[^0-9]/g, '');
  }

}
