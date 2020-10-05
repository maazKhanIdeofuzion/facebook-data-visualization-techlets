import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class ChartService {

  constructor(private http: HttpClient) { }

  getGraphData() {
    return this.http.get('./../../assets/csv/fb_police.csv', {responseType: 'text'});
  }
}
