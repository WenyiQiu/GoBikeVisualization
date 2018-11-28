// Creates a bootstrap-slider element
$("#monthSlider").slider({
    tooltip: 'always',
    tooltip_position:'bottom'
});
// Listens to the on "change" event for the slider
$("#monthSlider").on('change', function(event){
    // Update the chart on the new value
    updateChart(event.value.newValue);
});

// Creates a bootstrap-slider element
$("#timeSlider").slider({
    tooltip: 'always',
    tooltip_position:'bottom'
});
// Listens to the on "change" event for the slider
$("#timeSlider").on('change', function(event){
    // Update the chart on the new value
    updateChart(event.value.newValue);
});

// Create a Map
var myMap = L.map('map').setView([37.805,-122.354849], 12);

// Set the Map to GreyScale
L.TileLayer.Grayscale = L.TileLayer.extend({
    options: {
        quotaRed: 21,
        quotaGreen: 71,
        quotaBlue: 8,
        quotaDividerTune: 0,
        quotaDivider: function() {
            return this.quotaRed + this.quotaGreen + this.quotaBlue + this.quotaDividerTune;
        }
    },

    initialize: function (url, options) {
        options = options || {}
        options.crossOrigin = true;
        L.TileLayer.prototype.initialize.call(this, url, options);

        this.on('tileload', function(e) {
            this._makeGrayscale(e.tile);
        });
    },

    _createTile: function () {
        var tile = L.TileLayer.prototype._createTile.call(this);
        tile.crossOrigin = "Anonymous";
        return tile;
    },

    _makeGrayscale: function (img) {
        if (img.getAttribute('data-grayscaled'))
            return;

                img.crossOrigin = '';
        var canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        var imgd = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var pix = imgd.data;
        for (var i = 0, n = pix.length; i < n; i += 4) {
                        pix[i] = pix[i + 1] = pix[i + 2] = (this.options.quotaRed * pix[i] + this.options.quotaGreen * pix[i + 1] + this.options.quotaBlue * pix[i + 2]) / this.options.quotaDivider();
        }
        ctx.putImageData(imgd, 0, 0);
        img.setAttribute('data-grayscaled', true);
        img.src = canvas.toDataURL();
    }
});

L.tileLayer.grayscale = function (url, options) {
    return new L.TileLayer.Grayscale(url, options);
};

// Intialize the Map
L.tileLayer.grayscale('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1IjoiamFydmVlIiwiYSI6ImNqb2Y4Z3U4aDAxcnkza3BodmNndGM5M2wifQ.07r_YRi1y_H3YzEP5A4-vQ'
}).addTo(myMap);



var svgLayer = L.svg();
svgLayer.addTo(myMap)

var brush = d3.brush()
    .extent([[0, 0], [500, 500]])
    .on("start", ()=>{

    })
    .on("brush", ()=>{

    })
    .on("end", ()=>{

    });


// Global Data
var completeData;
var heatMapData;
const MONTH = 10;
const HOUR = 24;
var quickMap = new Map();


// UI configuration & Global SVG handler
var mapSvg = d3.select('#map').select('svg');
var stations;
var stationEnter;

let heatMapSvg = d3.select("#heatmap-svg");
let heatMapPadding = {t: 60, r: 40, b: 30, l: 40};
let hours = ["1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a", "11a", "12a", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p", "11p", "12p"];
let days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
let heatMapSvgWidth = heatMapSvg.attr('width');    
let heatMapChartWidth = heatMapSvgWidth - heatMapPadding.l - heatMapPadding.r;
let heatMapGridWidth = heatMapChartWidth / HOUR;
let startColorScale = d3.scaleSequential(d3.interpolateBlues);
let endColorScale = d3.scaleSequential(d3.interpolateOranges);
let heatMapStartColorRange = [0, 0];
let heatMapEndColorRange = [0, 0];

let heatMapG = heatMapSvg.append('g')
    .attr('class', 'heatmap')
    .attr('transform', `translate(${heatMapPadding.l}, ${heatMapPadding.t})`);
let xSVGAxis = heatMapSvg.append('g')
    .attr('class', 'x axis')
    .attr('transform', `translate(${heatMapPadding.l}, ${heatMapPadding.t})`);

// Color scale for count station frequencies
//colorScale = d3.scaleOrdinal(d3.schemeCategory10);
colorScale = d3.scaleSequential(d3["interpolateBlues"]);
                

d3.json('../data/station.json', (err, stationData)=>{
    if(err){
        //console.log(err);
        alert("Error!");
        return;
    }
    for(let i = 0; i < stationData.length; i++){
        quickMap.set(stationData[i].name, stationData[i]);
    }

    console.log(quickMap);

    completeData = stationData;
    heatMapData = aggregateDataByMonth();
    //console.log(heatMapData);
    
    //initalize map
    let stationG = mapSvg.append('g');
    //stationG.call(brush);
    stations = stationG
        .selectAll('.station')
        .data(stationData, (d)=>{
            return d.name;
        });

    
    // initalize Heatmap
    let xAxisText = xSVGAxis.selectAll('text')
        .data(hours);
    let textEnter = xAxisText.enter()
        .append("text")
        .text(d=>d)
        .attr('x', (d,i)=>{return i * heatMapGridWidth})
        .attr('y', 0)
        .style("text-anchor", "middle")
        .attr("transform", "translate(" + heatMapGridWidth / 2 + ", -6)");

    // Plot Station in the Map
    updateChart(0);
    drawStation();
    myMap.on('zoomend', drawStation);

    drawHeatmap();
    
    
});

function updateChart(time) {
    stationEnter = stations.enter()
        .append('circle')
        .attr('class', 'point')
        .attr('fill', function(d) {

            var max = d3.max(d.month_usage.overall[1]); 
            console.log(max);
            colorScale.domain([0, max+10]);
            return colorScale(d.month_usage.overall[1][time]);
        })
        .attr('r', 4)
        .attr('cx', d=>{return myMap.latLngToLayerPoint(d.location).x})
        .attr('cy', d=>{return myMap.latLngToLayerPoint(d.location).y});
}

function drawStation() {
    stationEnter.merge(stations)
        .attr('cx', d=>{
            return myMap.latLngToLayerPoint(d.location).x
        })
        .attr('cy', d=>{
            return myMap.latLngToLayerPoint(d.location).y
        });
}

function drawHeatmap(){
    
    /* 10 * 24 * 2
    * [
    *  [[start, end], [],], // January
    * ]
    */
   heatMapStartColorRange[0] = heatMapData[0][0][0];
   heatMapStartColorRange[1] = heatMapData[0][0][0];
   heatMapEndColorRange[0] = heatMapData[0][0][1];
   heatMapEndColorRange[1] = heatMapData[0][0][1];
   for(let i = 0; i < MONTH; i++){
       for(let j = 0; j < HOUR; j++){
           if(heatMapData[i][j][0] > heatMapStartColorRange[1]){
            heatMapStartColorRange[1] = heatMapData[i][j][0];
           }
           if(heatMapData[i][j][0] < heatMapStartColorRange[0]){
            heatMapStartColorRange[0] = heatMapData[i][j][0];
           }
           if(heatMapData[i][j][1] > heatMapEndColorRange[1]){
            heatMapEndColorRange[1] = heatMapData[i][j][1];
           }
           if(heatMapData[i][j][1] < heatMapEndColorRange[0]){
            heatMapEndColorRange[0] = heatMapData[i][j][1];
           }
       }
   }
   heatMapStartColorRange[0] = Math.sqrt(heatMapStartColorRange[0]);
   heatMapStartColorRange[1] = Math.sqrt(heatMapStartColorRange[1]);
   heatMapEndColorRange[0] = Math.sqrt(heatMapEndColorRange[0]);
   heatMapEndColorRange[1] = Math.sqrt(heatMapEndColorRange[1]);
   //console.log(heatMapStartColorRange, heatMapEndColorRange);
   startColorScale.domain(heatMapStartColorRange);
   endColorScale.domain(heatMapEndColorRange);
    
    let heatMapGridHeight = 30;
    let heatMapChartHeight = heatMapGridHeight * heatMapData.length;
    let heatMapSvgHeight = heatMapChartHeight + heatMapPadding.t + heatMapPadding.b;
    heatMapSvg.attr('height', heatMapSvgHeight);

    let heatmap = heatMapG.selectAll('.list')
        .data(heatMapData); // bind data with k
    
    let rows = heatmap.enter()
        .append('g')
        .attr('class', 'list')
        .attr('transform', (d, i)=>{
            return `translate(0, ${i * heatMapGridHeight})`
        });
    
    let blocks = rows
        .selectAll('.block')
        .data(d=>d)
        .enter()
        .append('g')
        .attr('class', 'block')
        .attr('transform', (d, i)=>{
            return `translate(${i * heatMapGridWidth}, 0)`;
        });
    let triangles = blocks
        .selectAll('.triangle')
        .data(d=>d)
        .enter()
        .append('polygon')
        .attr('points', (d, i)=>{
            if(i === 0){
                // start
                return `0,0 ${heatMapGridWidth},0 0,${heatMapGridHeight}`;
            }else{
                return `${heatMapGridWidth},0 0,${heatMapGridHeight} ${heatMapGridWidth},${heatMapGridHeight}`;
            }
        })
        .attr('fill', (d, i)=>{
            if(i === 0){
                return startColorScale(Math.sqrt(d));
                //return 'green';
            }else{
                return endColorScale(Math.sqrt(d));
                //return 'blue';
            }
        })
        
    heatmap.exit().remove();

}


/**
 * 10 * 24 * 2
 * [
 *  [[start, end], [],], // January
 * ]
 *  */
function aggregateDataByMonth(stationNames){
    let result = new Array(MONTH);
    for(let i = 0; i < MONTH; i++){
        result[i] = new Array(HOUR);
        for(let j = 0; j < HOUR; j++){
            result[i][j] = [0, 0];
        }
    }
    if(!stationNames){
        stationNames = [];
        for(let i  =0 ; i < completeData.length; i++){
            stationNames.push(completeData[i].name);
        }
    }
    for(let i  =0 ; i < stationNames.length; i++){
        if(quickMap.has(stationNames[i])){
            let station = quickMap.get(stationNames[i]).month_usage;
             // 10 * 24
            for(let i = 0; i < MONTH; i++){
                for(let j = 0; j < HOUR; j++){
                    result[i][j][0] += station.start[i][j];
                    result[i][j][1] += station.end[i][j];
                }
            }
        }
    }
    return result;

}
function aggregateDataByDay(){

}
