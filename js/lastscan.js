class LastScan{
    constructor(maxLength = 10){
        this.text = '';
        this.result = undefined;
        this.scans = [];
        this.maxLength = maxLength;
    }

    unshift(el){
        if (el != this.get(0)){
            this.scans.unshift(el);
            if (this.scans.length > 10){
                this.scans.pop();
            }
        }
    }

    get(idx){
        return this.scans[idx];
    }

    set(idx, el){
        this.scan[idx] = el;
    }
}

export { LastScan };