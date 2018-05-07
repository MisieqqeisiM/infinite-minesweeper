/**
 * Created by sisc0606 on 19.08.2017.
 */
import Cell from "./Cell";
import * as Layouts from "./Layouts";
import * as PIXI from "pixi.js";

const EventEmitter = PIXI.utils.EventEmitter;


import {Chunk} from "./Chunk"
import {CHUNK_SIZE} from "./Chunk"
import FieldData from "./FieldData"
/**
 * events:
 * changedCells, if any cells have been changed, returns an array of the cells that have been changed
 * wrongMove, if a wrong cell has been pressed (open mine or flag non-mine), returns the cell that was pressed
 */
export default class Field extends EventEmitter {
	// do not call any of the cell's functions in the field class, to prevent
	// infinite loops

	private chunksToSave: any;
	public probability: number;
	public safeRadius: number;
	public pristine: boolean;
	public gameOver:boolean;
	public neighborPosition: any;
	public score: number;
	public visibleChunks: any;
	private fieldData: FieldData;

	constructor(probability=0.5, safeRadius=1){
		super();
		// this is the probability that a mine is a cell
		this.probability = probability;
		// the field is pristine if no cells are opened, set this to true again with
		// Field.restart()
		this.pristine = true;
		// makes the first click not press a mine, radius is a float and checks in a circle
		this.safeRadius = safeRadius;
		this.gameOver = false;

		this.neighborPosition = Layouts.normal;
		this.score = 0;

		this.visibleChunks = [];
		this.fieldData = new FieldData(this);
		// todo someday: 
		// be able to change the options through an object
		// overwrite mine state
		// freeze mode
	}

	getCell(x, y){
		return this.fieldData.getCell(x,y);
	}
	open(x, y){
		// returns an array of all the opened cells: [Cell, Cell, Cell, ...]
		// todo sanitize input

		if(this.pristine) this.setSafeCells(x, y);
		let cell = this.getCell(x,y);

		if(!this.isEligibleToOpen(x, y)){
			return false;
		}
		
		//todo better generation
		if(cell.isMine === undefined){
			cell = this.fieldData.generateCell(x, y, cell.isFlagged);
		}
		
		cell.isOpen = true;

		let openedCells = [];
		openedCells.push(cell);

		if(cell.isMine){
			console.log("game over, you stepped on a mine:", cell);
			this.score-=100;
			this.emit("cellChanged", cell);
			return false; 
		}
		this.score++;

		// generating of neighbors. we generate the cells when a neighbor is opened
		let neighbors = cell.getNeighbors();
		for (var i = 0; i < neighbors.length; i++) {
			if(neighbors[i].isMine === undefined){
				// debugging
				// console.log("opened neighbor is undefined, generating", neighbors[i].x, neighbors[i].y);
				this.fieldData.generateCell(neighbors[i].x, neighbors[i].y);
			}
		}

		// we emit the event before doing the floodfill
		this.emit("cellChanged", cell);
		
		// floodfill
		if(cell.value() === 0){
			cell.getNeighbors() // get all the neighbors
				.filter(neighbor=>!neighbor.isOpen) // filter the array, so only the closed neighbors are in it
				.forEach(closedNeighbor=>{
					closedNeighbor.open();
				});
		}

		return openedCells.length >= 1;
	}
	save(){
		this.fieldData.save();
	}
	flag(x, y){
		let cell = this.getCell(x, y);
		if(!cell.isOpen){
			cell.isFlagged = !cell.isFlagged;
			this.emit("cellChanged", cell);
		}
		let chunkX = Math.floor(x/CHUNK_SIZE);
		let chunkY = Math.floor(y/CHUNK_SIZE);
		this.fieldData.addChunkToSave(chunkX,chunkY);
	}
	getNeighbors(x:number, y:number):Cell[]{
		return this.fieldData.getNeighbors(x,y);
	}
	unloadChunk(x,y){
		this.fieldData.unloadChunk(x,y);
	}
	restart(){// todo
		this.pristine = true;
		// todo: delete all of the rows, update all of the cells
	}
	getAll(){// returns all the cells, in a 1-dimensonal array, for easy iteration
		return this.fieldData.getAll();
	}
	value(x:number, y:number):number{// returns the amount of surrounding mines
		return this.fieldData.value(x,y);
	}
	checkForErrors(){
		// debugging
		let cells = this.getAll();
		let openedCells = cells.filter(cell=>cell.isOpen);
		
		if(openedCells.some(cell=>cell.isFlagged)) console.error("cell is flagged and open", openedCells.filter(cell=>cell.isFlagged));
		
		let undefinedCells = cells.filter(cell=>cell.isMine===undefined);
		if(undefinedCells.length > 0) console.error("undefined cells", undefinedCells);
	}
	isEligibleToOpen(x, y){// returns a bool, whether this cell can be opened
		//if(this.gameOver) return false;
		let cell = this.getCell(x, y);
		if(cell.isFlagged) return false;
		if(cell.isOpen)	return false;
		return true;
	}
	setVisibleChunk(x,y){
		this.visibleChunks.push({'x':x,'y':y});
	}
	loadVisibleChunks(){
		this.fieldData.keepChunks(this.visibleChunks);
		this.visibleChunks = [];
	}
	setSafeCells(x0, y0){// initiate the field with a circle of cells that aren't mines
		this.pristine = false;
		let r = this.safeRadius;
		
		console.log("safeRadius", this.safeRadius);
		
		for (let dy = Math.floor(-r); dy < Math.ceil(r); dy++) {
			for (let dx = Math.floor(-r); dx < Math.ceil(r); dx++) {
				// if the cell is in a circle with radius r
				if(r**2>dx**2+dy**2){
					let x = x0+dx;
					let y = y0+dy;
					// we generate the cell, and overwrite the isMine state
					this.fieldData.generateCell(x, y, false, false);
				}
				// one-lined version
				// if(r**2>dx**2+dy**2) this.open(x0+dx, y0+dx);
			}
		}
	}
	toJSON() {
		const fieldToStore: any = {};
		fieldToStore.probability = this.probability;
		fieldToStore.score = this.score;
		return fieldToStore;
	}
}
