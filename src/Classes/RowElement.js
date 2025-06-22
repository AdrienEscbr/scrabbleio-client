class RowElement {
    constructor(index) {
      if (new.target === RowElement) {
        throw new TypeError("Cannot construct RowElement instances directly");
      }
      this._index = index;
    }
  
    // Getter pour l'index
    get index() {
      return this._index;
    }
  
    // Setter pour l'index
    set index(value) {
      this._index = value;
    }
  }
  
  export default RowElement;
  