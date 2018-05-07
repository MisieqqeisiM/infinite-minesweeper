import Cell from "./Cell";
import {Chunk} from "./Chunk"
import {CHUNK_SIZE} from "./Chunk"
import Field from "./Field"
export default class FieldData{
    private chunks: Chunk[][];
    private field:Field;
	private chunksToSave:Chunk[];
    constructor(field:Field){
		this.chunks = [];
        this.chunksToSave = [];
        this.field = field;
    }
    private getChunk(x:number,y:number):Chunk{
        return this.chunks[x][y];
    }
    public getCell(x, y):Cell{
		// if the row or cell is not created, we will get an error: cant read property of undefined
		let chunkX = Math.floor(x/CHUNK_SIZE);
		let chunkY = Math.floor(y/CHUNK_SIZE);
		this.generateChunk(chunkX,chunkY);
		
		return this.chunks[chunkX][chunkY].getCellFromGlobalCoords(x,y);
	}
    private loadChunk(x:number,y:number,visible:boolean):Chunk{
        let chunk = window.FieldStorage.loadChunk(window.fieldName,x,y,this.field,visible);
        return chunk;
    }
    private generateChunk(x:number,y:number){
		if(!(x in this.chunks)) this.chunks[x] = [];
		if(!(y in this.chunks[x])){
			this.chunks[x][y] = this.loadChunk(x,y,true);
			if(this.chunks[x][y]===undefined)
				this.chunks[x][y] = new Chunk(x,y,this.field,true);
			else{
                this.field.emit("chunkChanged",this.chunks[x][y]);
			}
		}else if(this.chunks[x][y].visible==false){
			this.chunks[x][y].visible = true;
			this.field.emit("chunkChanged", this.chunks[x][y]);
		}
	}
    public showChunk(x:number,y:number){
		if(!(x in this.chunks)) this.chunks[x] = [];
		if(!(y in this.chunks[x])){
			let chunk = this.loadChunk(x,y,true);
			if(!(chunk===undefined)){
			    this.chunks[x][y]=chunk;
				this.field.emit("chunkChanged", this.chunks[x][y]);
			}
		} else if(this.chunks[x][y].visible==false){
			this.chunks[x][y].visible = true;
			this.field.emit("chunkChanged", this.chunks[x][y]);
		}
	}
	
    public unloadChunk(x:number,y:number){
		if(this.chunks[x][y].visible)
		this.chunks[x][y].getAll().forEach((cell)=>{
			if(!(cell.sprite === undefined)){
				cell.sprite.parent.removeChild(cell.sprite);
			}
		});
		
		window.FieldStorage.saveChunk(this.chunks[x][y]);
		delete this.chunks[x][y];
    }
    public generateCell(x:number, y:number, isFlagged:boolean = false, isMine:boolean = undefined):Cell{
		//calculates coordinates of a chunk
		let chunkX = Math.floor(x/CHUNK_SIZE);
		let chunkY = Math.floor(y/CHUNK_SIZE);
		//generates a chunk if it isn't already generated
		this.generateChunk(chunkX,chunkY);
		if(!this.chunksToSave.includes(this.getChunk(chunkX,chunkY))){
			this.chunksToSave.push(this.getChunk(chunkX,chunkY));
		}
		//gets a reference to a cell that we want to generate from the chunk
		let cell = this.getChunk(chunkX,chunkY).getCellFromGlobalCoords(x,y);

		//if isMine field of the cell is undefined we calculate it
		if(cell.isMine===undefined) {
			//todo: seed based generation
			if(isMine === undefined)
				isMine = Math.random() < this.field.probability;
			cell.isMine = isMine;
			cell.isFlagged = isFlagged;
			return cell;
        } else {console.warn(x, y, "is already generated");}
        return undefined;
	}
	private generateChunkWithoutLoading(x:number,y:number){
		if(!(x in this.chunks)) this.chunks[x] = [];
		if(!(y in this.chunks[x])){
			this.chunks[x][y] = this.loadChunk(x,y,false);
			if(this.chunks[x][y]===undefined)
				this.chunks[x][y] = new Chunk(x,y,this.field,false);
		}
	}
	private getCellWithoutLoading(x:number,y:number){
		let chunkX = Math.floor(x/CHUNK_SIZE);
		let chunkY = Math.floor(y/CHUNK_SIZE);
		this.generateChunkWithoutLoading(chunkX,chunkY);
		
		return this.chunks[chunkX][chunkY].getCellFromGlobalCoords(x,y);
	}
	public getNeighbors(x:number,y:number):Cell[]{
		let neighbors = [];
		for (var i = 0; i <= this.field.neighborPosition.length - 1; i++) {
			let newX = x + this.field.neighborPosition[i][0];
			let newY = y + this.field.neighborPosition[i][1];
			neighbors.push(this.getCellWithoutLoading(newX,newY));
		}
		return neighbors;
	}
	public value(x:number,y:number):number{
		let cell = this.getCell(x,y);
		// it does not make sense to request the value of a closed cell
		if(cell.isOpen === false) return null;
		else return this.getNeighbors(x, y)
			.filter(cell=>cell.isMine)
			.length;
	}
    public getAll():Cell[]{// returns all the cells, in a 1-dimensonal array, for easy iteration
		// includes all af the open cells, and their neighbors(the border)
		let cells = [];
		for (let i in this.chunks) {
			for (let j in this.chunks[i]) {
				let chunk = this.chunks[i][j];
				let fromChunk = chunk.getAll();
				for(let k in fromChunk)
					cells.push(fromChunk[k]);
			}
		}
		return cells;
    }
    public save(){
        this.field.emit("save",this.chunksToSave.slice(0));
		this.chunksToSave = [];
    }
    public addChunkToSave(x,y){
        if(!this.chunksToSave.includes(this.getChunk(x,y))){
			this.chunksToSave.push(this.getChunk(x,y));
		}
	}
	public keepChunks(chunkCoords){
		for(let x in this.chunks){
			for(let y in this.chunks[x]){
				let remove = true;
				for(let i = 0; i<chunkCoords.length;i++){
					if(chunkCoords[i].x==x && chunkCoords[i].y==y)
						remove = false;
				}
				if(remove){
					this.unloadChunk(parseInt(x),parseInt(y));
				}
			}
		}
		for(let i = 0; i<chunkCoords.length;i++){
			this.showChunk(chunkCoords[i].x,chunkCoords[i].y);
		}
	}
}