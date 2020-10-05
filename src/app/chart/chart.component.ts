import { AfterViewInit, Component, NgZone, OnInit } from '@angular/core';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import * as am4plugins_bullets from "@amcharts/amcharts4/plugins/bullets";
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import { lineTo } from '@amcharts/amcharts4/.internal/core/rendering/Path';
import { ChartService } from './../services/chart.service';
import Papa from 'papaparse';
am4core.useTheme(am4themes_animated);

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss'],
  providers: [ChartService]
})
export class ChartComponent implements OnInit, AfterViewInit {
  // Limit of records to be visualize on graph
  // We have big data so we will show data in chunks
  // The limit will show data and graph will be responsive
  // If we push all data to visualize then browser will get stuck because of load
  graphDataLimit: number = 100;
  skip: number = 0;
  // json data which is rendered on graph
  jsonData: any = [];
  // List of all json data so that we don't have to get it every time from CSV
  jsonAllData: any = [];

  isChecked: boolean = false;

  constructor(private zone: NgZone, private chartService: ChartService) { }

  ngOnInit(): void { }

  /**
   * Afer View init for graph visualization
   */
  ngAfterViewInit() {
    this.generateChartData()
  }

  /**
   * Filter json data according to user selected dates
   * @param to Last date user selected
   * @param from First date user selected
   */
  filterDataAccordingToDates(to, from) {
    const startDate = new Date(from);
    const endDate = new Date(to);

    const resultGraphData = this.jsonAllData.filter((obj: any) => {
      const date = new Date(obj.date);
      return date >= startDate && date <= endDate;
    });
    this.jsonData = resultGraphData;
    console.log('jsonData to, from ==>>', to, from, this.jsonData);
    this.showGraph();
  }

  /**
   * On dropdown change this function is called
   * @param e event obj
   */
  graphDataListChangeClick(e) {
    console.log('e', e);
    this.graphDataLimit = parseInt(e.target.value);
    this.getDatesForFilter();

  }

  /**
   * on checkbox click
   */
  checkBoxClicked(e) {
    if(e.target.checked){
      this.isChecked = true;
      this.getDatesForFilter();
    } else {
      this.isChecked = false;
      this.getPostsDataPerDay()
    }
  }

  /***
   * changeFilterClicked() change filter data
   * 0 means pervious
   * 1 means next
   */
  changeFilterClicked(e: number) {
    console.log('e', e)
    if (e === 0) {
      if (this.skip !== 0) {
        this.skip < this.graphDataLimit ? this.skip = 0 : '';
        this.skip = Math.abs(this.graphDataLimit - this.skip);
        console.log('this.skip', this.skip);
        this.getDatesForFilter()
      }
    } else {
      if (this.skip <= this.jsonAllData.length) {
        this.skip = Math.abs(this.graphDataLimit + this.skip);
        this.getDatesForFilter()
      }

    }
  }

  /**
   * Fetch data from CSV
   * Convert data to json.
   * change date, comments and reactions according to our need
   * We need date in YYYY-MM-DD format.
   * We want comments and reactions in Numbers
   */
  generateChartData() {
    // Implementing promise so that we can get data after view init
    // return new Promise((resolve, reject) => {
    // If json data in empty fetch it else just return promise
    // if (this.jsonAllData.length === 0) {
      // Fetching data from service
      this.chartService.getGraphData().subscribe((data: any) => {
        // Parsing data to an array using Papa parser
        const arrayData = Papa.parse(data).data;
        // getting headers
        const headers = arrayData[0];
        // removing headers from array
        arrayData.shift();
        // Mapping data and generating json according to our needs
        arrayData.map((obj: any, i: number) => {
          const singleObj = {};
          // splitting date
          const dateParts = obj[2] && obj[2].split("/");
          // Changing data format from DD/MM.YYYY to YYYY-MM-DD
          singleObj[`${headers[2].toLowerCase()}`] = dateParts && `${dateParts[2] + '-' + dateParts[1] + '-' + dateParts[0]}`;
          // Parsing comments and reactions to integer
          singleObj[`${headers[5].toLowerCase()}`] = parseInt(obj[5]);
          singleObj[`${headers[6].toLowerCase()}`] = parseInt(obj[6]);
          singleObj[`${headers[7].toLowerCase()}`] = parseInt(obj[7]);
          singleObj[`${headers[8].toLowerCase()}`] = parseInt(obj[8]);
          singleObj[`${headers[9].toLowerCase()}`] = parseInt(obj[9]);

          // List of All data
          this.jsonAllData.push(singleObj)
        });

        // Sorting data according to date
        this.jsonAllData.sort(function (a, b) {
          if (a.date && b.date) {
            a = a.date.split('-');
            b = b.date.split('-');
            return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
          }
        });
        console.log('this.jsonAllData', this.jsonAllData);
        console.log('jsonData', this.jsonData);
        if(this.isChecked) {
          this.getDatesForFilter();
        } else {
          this.getPostsDataPerDay()
        }

        // console.log('filterDates', filterDates)

        // resolve(this.jsonData);
      });
    // } else {
      // resolve(this.jsonData);
    // }
    // })
  }

  /**
   * get dates for filter
   */
  getDatesForFilter() {
    const from = this.jsonAllData[this.skip] ? this.jsonAllData[this.skip].date : this.jsonAllData[0].date;
    const to = this.jsonAllData[this.skip + this.graphDataLimit] ?
      this.jsonAllData[this.skip + this.graphDataLimit].date : this.jsonAllData[this.jsonAllData.length - 1].date;
    this.filterDataAccordingToDates(to, from);
    // return {from, to};
  }

  /**
   * Clean data further by
   * grouping by date and adding comments and reactions in one single obj
   * thats how we can get correct data.
   * reactions and comments of all posts per day.
   */
  getPostsDataPerDay() {
    const tempJsonData = this.jsonAllData
    var result = tempJsonData.reduce(function(acc, x) {
      console.log('acc==>', acc,' x==>', x)
      var date = acc[x.date]
      console.log('date===>', date)
      if (date) {
        date.angry += x.angry
        date.comments += x.comments
        date.haha += x.haha
        date.love += x.love
        date.wow += x.wow

      } else {
        acc[x.date] = x
        // delete x.date
      }
      return acc
    },{})

    var toCollection = function(obj) {
      return Object.keys(obj)
        .sort(function(x, y){return +x - +y})
        .map(function(k){return obj[k]})
    }
    this.jsonData = toCollection(result);
    this.showGraph()
    console.log('result===>>>', toCollection(result))
  }

  showGraph() {
    this.zone.runOutsideAngular(async () => {
      let chart = am4core.create("chartdiv", am4charts.XYChart);
      chart.colors.step = 2;
      chart.paddingRight = 20;

      // chart.data = this.generateChartData();
      chart.data = this.jsonData;
      console.log('chart.data', chart.data)
      let dateAxis = chart.xAxes.push(new am4charts.DateAxis());
      dateAxis.renderer.minGridDistance = 50;


      const createAxisAndSeries = (field, name, opposite, bullet, chart) => {
        let valueAxis: any = chart.yAxes.push(new am4charts.ValueAxis<any>());
        if (chart.yAxes.indexOf(valueAxis) != 0) {
          valueAxis.syncWithAxis = chart.yAxes.getIndex(0);
        }

        let series = chart.series.push(new am4charts.LineSeries());
        series.dataFields.valueY = field;
        series.dataFields.dateX = "date";
        series.strokeWidth = 2;
        series.yAxis = valueAxis;
        series.name = name;
        series.tooltipText = "{name}: [bold]{valueY}[/]";
        series.tensionX = 0.8;
        series.showOnInit = true;
        series.minBulletDistance = 15;

        let interfaceColors = new am4core.InterfaceColorSet();

        switch (bullet) {
          case "triangle":
            let bulletB = series.bullets.push(new am4charts.Bullet());
            bulletB.width = 12;
            bulletB.height = 12;
            bulletB.horizontalCenter = "middle";
            bulletB.verticalCenter = "middle";

            let triangle = bulletB.createChild(am4core.Triangle);
            triangle.stroke = interfaceColors.getFor("background");
            triangle.strokeWidth = 2;
            triangle.direction = "top";
            triangle.width = 12;
            triangle.height = 12;
            break;
          case "rectangle":
            let bulletR = series.bullets.push(new am4charts.Bullet());
            bulletR.width = 10;
            bulletR.height = 10;
            bulletR.horizontalCenter = "middle";
            bulletR.verticalCenter = "middle";

            let rectangle = bulletR.createChild(am4core.Rectangle);
            rectangle.stroke = interfaceColors.getFor("background");
            rectangle.strokeWidth = 2;
            rectangle.width = 10;
            rectangle.height = 10;
            break;
          case "cone":
            let bulletCO = series.bullets.push(new am4charts.Bullet());
            bulletCO.width = 10;
            bulletCO.height = 10;
            bulletCO.horizontalCenter = "middle";
            bulletCO.verticalCenter = "middle";

            let cone = bulletCO.createChild(am4core.Cone);
            cone.stroke = interfaceColors.getFor("background");
            cone.strokeWidth = 2;
            cone.width = 10;
            cone.height = 10;
            break;
          default:
            let bulletC = series.bullets.push(new am4charts.CircleBullet());
            bulletC.circle.stroke = interfaceColors.getFor("background");
            bulletC.circle.strokeWidth = 2;
            break;
        }

        valueAxis.renderer.line.strokeOpacity = 1;
        valueAxis.renderer.line.strokeWidth = 2;
        valueAxis.renderer.line.stroke = series.stroke;
        valueAxis.renderer.labels.template.fill = series.stroke;
        valueAxis.renderer.opposite = opposite;
      }


      createAxisAndSeries("comments", "Comments", false, "circle", chart);
      createAxisAndSeries("angry", "Angry", true, "triangle", chart);
      createAxisAndSeries("haha", "HAHA", true, "rectangle", chart);
      createAxisAndSeries("wow", "Wow", true, "cone", chart);
      createAxisAndSeries("love", "Love", true, "diamond", chart);
      // Add legend
      chart.legend = new am4charts.Legend();

      // Add cursor
      chart.cursor = new am4charts.XYCursor();
    });
  }

}
