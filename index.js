const express = require('express');
const app = express();
const cors = require('cors');
const moment = require('moment');
const jwt = require('jsonwebtoken')
require('dotenv').config();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


const port = process.env.PORT||5000;

//middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.i5g3jew.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const userCollection = client.db("surveyDb").collection("users");
    const surveyCollection = client.db("surveyDb").collection("survey");
    const paymentCollection = client.db("surveyDb").collection("payment");
    //jwt

    app.post('/jwt',async(req,res)=>{
        const user = req.body;
        console.log('user for token', user);
        const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '24h'});
        res.send({token});
        
      })


     const verifyToken =(req,res,next) =>{
        console.log('inside verify token', req.headers.authorization);
        if(!req.headers.authorization){
            return res.status(401).send({message: 'unauthorized access'});
        }
        const token = req.headers.authorization.split(' ')[1];
        console.log(token);
        jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded) => {
            if(err){
                return res.status(401).send({message:'unauthorized access'})
            }
            req.decoded = decoded;
            next();
        })
        // next();
     }

     const verifyAdmin = async (req,res,next)=>{
        const email = req.decoded.email;
        const query = {email: email};
        const user = await userCollection.findOne(query);
        const isAdmin = user?.role ==='admin';
        if(!isAdmin){
            return res.status(403).send({message: 'forbidden access'});

        }
        next();
     }
    //  const verifySurveyor = async (req,res,next)=>{
    //     const email = req.decoded.email;
    //     const query = {email: email};
    //     const user = await userCollection.findOne(query);
    //     const isSurveyor = user?.role ==='surveyor';
    //     if(!isSurveyor){
    //         return res.status(403).send({message: 'forbidden access'});

    //     }
    //     next();
    //  }



      app.get('/user',verifyToken,verifyAdmin, async (req, res) => {
        // console.log(req.headers);
        const result = await userCollection.find().toArray();
        res.send(result);
      });


      app.get('/user/admin/:email',verifyToken,async(req,res) => {
        const email = req.params.email;
        if(email!==req.decoded.email){
            return res.status(403).send({message:'forbidden access'})

        }
        const query ={email:email};
        const user = await userCollection.findOne(query);
        let admin = false;
        if(user){
            admin = user?.role === 'admin';
        }
        res.send({admin});
      })

      app.get('/user/surveyor/:email',verifyToken,async(req,res) => {
        const email = req.params.email;
        if(email!==req.decoded.email){
            return res.status(403).send({message:'forbidden access'})

        }
        const query ={email:email};
        const user = await userCollection.findOne(query);
        let surveyor = false;
        if(user){
            surveyor = user?.role === 'surveyor';
        }
        res.send({surveyor});
      })
      app.get('/user/pro/:email',verifyToken,async(req,res) => {
        const email = req.params.email;
        if(email!==req.decoded.email){
            return res.status(403).send({message:'forbidden access'})

        }
        const query ={email:email};
        const user = await userCollection.findOne(query);
        let proUser = false;
        if(user){
            proUser = user?.role === 'pro-user';
        }
        res.send({proUser});
      })


      app.get('/survey',async (req,res)=>{
        const result = await surveyCollection.find().toArray();
        res.send(result);
      });

      app.get('/survey/mostVote', async(req, res)=>{
        const result = await surveyCollection.find({status: 'published'})
        .project({title: 1, category:1, description: 1, totalVote: 1,image:1,liked:1,disliked:1, comments:1,})
        .sort({totalVote: -1})
        .limit(6)
        .toArray()
        res.send(result)
      })
  
      
  //     app.get('/survey/title/:title', async (req, res) => {
  //   const { title } = req.params;
  //   console.log(title);
  //   try {
  //     const survey = await surveyCollection.find({ title }).toArray();
  //     res.json(survey);
  //   } catch (error) {
  //     res.status(500).json({ message: 'Error fetching surveys by title' });
  //   }
  // });

  // // Endpoint for filtering by category
  // app.get('/survey/category/:category', async (req, res) => {
  //   const { category } = req.params;
  //   try {
  //     const survey = await surveyCollection.find({ category }).toArray();
  //     res.json(survey);
  //   } catch (error) {
  //     res.status(500).json({ message: 'Error fetching surveys by category' });
  //   }
  // });

  // Endpoint for sorting by totalVote in descending order
  app.get('/survey/sortByTotalVote', async (req, res) => {
    
      const surveys = await surveyCollection.find().sort({ totalVote: -1 }).toArray();
      res.json(surveys);
   
  });



      app.get('/survey/:id',  async(req,res)=>{
        const id = req.params.id;
        const email = req.query.email;
        console.log(email);
        const query ={_id:new ObjectId(id)}
        const result = await surveyCollection.findOne(query);
        let isUserVoted = false
      if(result){
        if(result.voted){
          const isvoted = result.voted.find(user =>user.email == email)
          console.log(result.voted);
          if(isvoted){
            isUserVoted =true
          }
        }
      }
      // console.log(isUserVoted);
      res.send({isUserVoted, result})
      // res.send(result);
      })

      app.get('/survey/update/:id',   async(req, res) => {
        const id = req.params.id
       
     
        const query = {_id: new ObjectId(id)}
        const result = await surveyCollection.findOne(query) 
        res.send(result)
        console.log(result)
      })
      
     app.post('/user',async(req,res) => {

        const user = req.body;
        const query = { email: user.email }
        const existingUser = await userCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: 'user already exists', insertedId: null })
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
     })

     app.post('/survey',verifyToken,async(req,res)=>{
        const item = req.body;
        const surveyData = {
            ...item,
            timestamp: moment().format('MMMM Do YYYY, h:mm:ss a'),
          };
        console.log(surveyData);
        const result =await surveyCollection.insertOne(surveyData);
        res.send(result);
     });
    
     app.patch('/user/admin/:id',verifyToken, async(req,res) =>{
        const id = req.params.id;
        const filter ={_id: new ObjectId(id)};
        const updatedDoc = {
            $set:{
                role:'admin'
            }
        }
        const result = await userCollection.updateOne(filter,updatedDoc);
        res.send(result);
     })

     app.patch('/user/surveyor/:id',verifyToken,verifyAdmin, async(req,res) =>{
        const id = req.params.id;
        const filter ={_id: new ObjectId(id)};
        const updatedDoc = {
            $set:{
                role:'surveyor'
            }
        }
        const result = await userCollection.updateOne(filter,updatedDoc);
        res.send(result);
     })


     app.patch('/user/pro/:email',verifyToken, async(req,res) =>{
      const email = req.params.email;
        
        const query = { email: email }
        const updatedDoc = {
            $set:{
                role:'pro-user'
            }
        }
        const result = await userCollection.updateOne(query,updatedDoc);
        res.send(result);
     })

      app.put('/updateSurvey/:id', verifyToken, async(req, res)=>{
      const id = req.params.id
      const {email, votedIn, liked, disliked, yesVoted, noVoted,totalVote,voteTime} = req.body
      // console.log(req.body)
      const survey = await surveyCollection.findOne({_id: new ObjectId(id)})
      // console.log(survey.voted);
      let updatedQuery;
      if(survey){
        
        if(survey.voted){
          updatedQuery= {
            $push: {voted: {email, votedIn,voteTime}},
            $inc: {liked: liked || 0, totalVote: totalVote, disliked: disliked || 0, yesVoted: yesVoted || 0, noVoted:noVoted || 0}
          } 
        }else{
          updatedQuery={
            $set: {voted: [{email, votedIn,voteTime}]},
            $inc: {liked: liked || 0, totalVote: totalVote, disliked: disliked || 0, yesVoted: yesVoted || 0, noVoted:noVoted || 0}
          }
        }
        
      }
      const result = await surveyCollection.updateOne({_id: new ObjectId(id)}, updatedQuery)
      console.log(updatedQuery);
      res.send(result)


    })

    app.put('/surveyReportUpdate/:id', verifyToken, async(req, res)=>{
      const id = req.params.id
      const report = req.query.report
      const survey = await surveyCollection.findOne({_id: new ObjectId(id)})
      let updatedQuery 
      if (survey) {
        if(survey.reports){
          updatedQuery = {
            $push: {reports: report}
          }
        }else{
          updatedQuery = {
            $set: {reports: [report]}
          }
        }
      }
      const result = await surveyCollection.updateOne({_id: new ObjectId(id)}, updatedQuery)
      res.send(result)
    })

    app.put('/surveyCommentUpdate/:id', verifyToken, async(req, res)=>{
      const id = req.params.id
 const comment = req.query.comment
 const survey = await surveyCollection.findOne({_id: new ObjectId(id)})
 let updatedQuery 
 if (survey) {
   if(survey.reports){
     updatedQuery = {
       $push: {comments: comment}
     }
   }else{
     updatedQuery = {
       $set: {comments: [comment]}
     }
   }
 }
 const result = await surveyCollection.updateOne({_id: new ObjectId(id)}, updatedQuery)
 res.send(result)
})



     app.patch('/survey/:id', async(req,res) =>{
        const item = req.body;
        console.log(item);
        const id = req.params.id;
        const filter ={_id: new ObjectId(id)};
        // console.log(filter);
        const updatedDoc = {
            $set:{
                status:item.status,
               adminFeedback:item.adminFeedback
                
            }
        }
        console.log(updatedDoc);
        const result = await surveyCollection.updateOne(filter,updatedDoc);
        console.log(result);
        res.send(result);
     })
    //  app.patch('/survey/unpublished/:id',verifyToken,verifyAdmin, async(req,res) =>{
    //     const id = req.body;
    //     console.log(id);
    //     // const filter ={_id: new ObjectId(id)};
    //     // const updatedDoc = {
    //     //     $set:{
    //     //         status:"unpublished"
    //     //     }
    //     // }
    //     // const result = await userCollection.updateOne(filter,updatedDoc);
    //     // res.send(result);
    //  })

     app.put('/survey/update/:id',verifyToken,async(req,res)=>{
        const item = req.body;
        const id = req.params.id;
        const filter = { _id: new ObjectId(id)}
        const options = { upsert: true };
        const updatedDoc = {
            $set:{
                title:item.title,
                totalVote:item.totalVote,
                category:item.category,
                description:item.description,
                image:item.image,
                question1:item.question1,
                question2:item.question2,
                question3:item.question3,
                deadline:item.deadline,
                timestamp: moment().format('MMMM Do YYYY, h:mm:ss a')
            }
        }
        const result = await surveyCollection.updateOne(filter,updatedDoc,options);
        res.send(result);
     })

     app.delete('/survey/:id',verifyToken,async(req,res)=>{
        const id = req.params.id;
        const query ={_id: new ObjectId(id)}
        const result = await surveyCollection.deleteOne(query);
        res.send(result);
     })

      app.delete ('/user/:id',verifyToken,verifyAdmin,async(req,res) =>{
         
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await userCollection.deleteOne(query);
        res.send(result);
      })

      app.get('/payment', verifyToken,verifyAdmin, async (req, res) => {
        // const query = { email: req.params.email }
        // console.log('email',query);
        // if (req.params.email !== req.decoded.email) {
        //   return res.status(403).send({ message: 'forbidden access' });
        // }
        const result = await paymentCollection.find().toArray();
        res.send(result);
      })
      
      app.post("/create-payment-intent", async (req, res) => {
        const { price } = req.body;
        const amount = parseInt(price * 100);
        // console.log(amount,'amount inside');
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ['card']
        });
      
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      });
      
      app.post('/payment',async(req,res)=>{
        const payment = req.body;
        const query = { email: payment.email }
        const existingUser = await paymentCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: 'user already exists', insertedId: null })
        }
        const paymentResult = await paymentCollection.insertOne(payment);
        console.log('payment info', payment);
        res.send(paymentResult);
      })




    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/',(req,res)=>{
    res.send('Polling and Survey application')
})

app.listen(port,()=>{

    console.log(`Polling and Survey application on port ${port}`);
})