const orderModel = require("../models/orderModel")
const userModel = require("../models/userModel")
const cartModel = require("../models/cartModel")
const { validateObjectId, validateString } = require("../validator/validations")


const createOrder = async function (req, res) {
    try {
        let userId = req.params.userId
        if (!validateObjectId(userId)) { return res.status(400).send({ status: false, message: "please provide valid userId" }) }

        let tokenUserId = req.user.userId
        if (tokenUserId !== userId) { return res.status(403).send({ status: false, message: "authorization failed" }) }

        let { cancellable, cartId } = req.body

        if(!cartId){return res.status(400).send({ status: false, message: "please provide cartId" })}
        if (!validateObjectId(cartId)) { return res.status(400).send({ status: false, message: "please provide valid cartId" }) }

        let user = await userModel.findOne({ _id: userId })
        if (!user) { return res.status(404).send({ status: false, message: "user with this userId not found" }) }

        let cart = await cartModel.findOne({ userId: userId }, { _v: 0, createdAt: 0, updatedAt: 0 }).lean()
        if (!cart) { return res.status(404).send({ status: false, message: "No cart found for this user" }) }

        if (cartId != cart._id) { return res.status(404).send({ status: false, message: "cart doesnot belongs to this user" }) }
        delete cart._id

        if(cart.items.length==0){return res.status(400).send({ status: false, message: "cart is empty" })}

        let count = 0
        for (i = 0; i < cart.items.length; i++) {
            count += cart.items[i].quantity
        }
        cart.totalQuantity = count

        if ("cancellable" in req.body) {
            if (!validateString(cancellable)) { return res.status(400).send({ status: false, message: "cancellable can't be empty" }) }
            if (!(cancellable == "false" || cancellable == "true")) { return res.status(400).send({ status: false, message: "please provide cancellable value in true or false" }) }
            if (cancellable == "false" || cancellable == false) { cart.cancellable = false }
            if (cancellable == "true" || cancellable == true) { cart.cancellable = true }
        }
        
        let orderCreated = await orderModel.create(cart)
        cart.items = []
        cart.totalPrice = 0
        cart.totalItems = 0

        let cartEmptied = await cartModel.findOneAndUpdate({ userId: userId }, { $set: cart })

        res.status(200).send({ status: true, message: "order created successfully", data: orderCreated })

    } catch (err) {
        console.log(err)
        return res.status(500).send({ status: false, message: err.message })
    }
}

let updateOrder = async function (req, res) {
    try {
        let userId = req.params.userId
        if (!validateObjectId(userId)) { return res.status(400).send({ status: false, message: "please provide valid userId" }) }

         let tokenUserId = req.user.userId
         if (userId !== tokenUserId) { return res.status(403).send({ status: false, message: "authorization failed" }) }

        let { status, orderId } = req.body

        if (!orderId) { return res.status(400).send({ status: false, message: "please provide orderId" }) }
        if (!validateObjectId(orderId)) { return res.status(400).send({ status: false, message: "please provide valid orderId" }) }

        if (!validateString(status)) { return res.status(400).send({ status: false, message: "please provide status" }) }
        if (!['pending', 'completed', 'cancled'].includes(status)) { return res.status(400).send({ status: false, message: "please provide status from [pending, completed, cancled] only" }) }

        let user = await userModel.findOne({ _id: userId })
        if (!user) { return res.status(404).send({ status: false, message: "user with this userId not found" }) }

        let order = await orderModel.findOne({ _id: orderId })
        if (!order) { return res.status(404).send({ status: false, message: "no order with this orderId" }) }

        if (userId != order.userId) { return res.status(400).send({ status: false, message: "this order doesnot belongs to this user" }) }

        if (order.status == "cancled") { return res.status(400).send({ status: false, message: "order was cancelled" }) }


        
        if (status == "cancled") {
            if (order.cancellable) {
                order.status = "cancled"

            }
            else { return res.status(400).send({ status: false, message: "this order is not cancellable" }) }
        }
        else {
            order.status = status
        }


        order.save()
        res.status(200).send({ status: true, data: order })



    }
    catch (err) {
        res.status(500).send({ status: true, message: err.message })
    }
}


module.exports = { createOrder, updateOrder }