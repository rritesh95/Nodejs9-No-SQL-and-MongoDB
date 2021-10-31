const mongodb = require('mongodb');
const getDb = require('../util/database').getDb;

const ObjectId = mongodb.ObjectId;

class User {
  constructor(username, email, cart, id){
    this.username = username;
    this.email = email;
    this.cart = cart;
    this._id = id;
  }

  save(){
    const db = getDb();
    return db.collection('users').insertOne(this);
  }

  addToCart(product){
    const productCartIndex = this.cart.items.findIndex(prd => {
      return prd.productId.toString() === product._id.toString();
      //OR return prd.productId == product._id; //as for javascript this ids works as a string
    });
    let newQuantity = 1;
    const updatedCartItems = [...this.cart.items];
    
    if(productCartIndex >= 0){
      newQuantity = updatedCartItems[productCartIndex].quantity + 1;
      updatedCartItems[productCartIndex].quantity = newQuantity;
    }
    else{
      updatedCartItems.push({
        productId: new ObjectId(product._id), 
        quantity: newQuantity 
      })
    }

    const updatedCart = { items: updatedCartItems };
    const db = getDb();
    return db.collection('users')
      .updateOne(
        { _id: new ObjectId(this._id)},
        { $set: {cart : updatedCart }}
      );
  }

  getCart(){
    const db = getDb();
    const productIds = this.cart.items.map(item => {
      return item.productId;
    });

    return db.collection('products')
      .find({ _id: {$in : productIds} })
      .toArray()
      .then(products => {
        return products.map(p => {
          return {
            ...p,
            quantity: this.cart.items.find(item => {
              return item.productId.toString() === p._id.toString();
            }).quantity
          };
        })
      })
      .catch(err => console.log(err));
  }

  deleteCartItem(prodId){
    const updatedCartItems = this.cart.items.filter(item => {
      return item.productId.toString() !== prodId.toString();
    });

    const db = getDb();
    return db.collection('users')
      .updateOne(
        { _id: new ObjectId(this._id)},
        { $set: {"cart.items" : updatedCartItems }}
      );
  }

  addOrder(){
    const db = getDb();
    return this.getCart()
      .then(products => {
        const order = {
          items : products,
          user: {
            _id: new ObjectId(this._id),
            name: this.username
          }
        };

        return db.collection('orders')
        .insertOne(order)
        .then(result => {
          this.cart = { items: [] };
          return db.collection('users')
            .updateOne(
              { _id: new ObjectId(this._id) },
              { $set: { cart: { items: [] } } }  
            );
        })
      })
      .catch(err => console.log(err));
  }

  getOrders(){
    const db = getDb();
    return db.collection('orders')
      .find({ "user._id": new ObjectId(this._id) })
      // .find({ user: { _id: new ObjectId(this._id) } })
      .toArray()
      .then(orders => {
        console.log(orders);
        return orders;
      })
      .catch(err => console.log(err));
  }

  static findById(userId){
    const db = getDb();
    return db.collection('users').findOne({ _id : new ObjectId(userId)});
    //alternate way
    // return db.collection('users')
    //   .find({_id : new ObjectId(userId)})
    //   .next()
  }
}

module.exports = User;
