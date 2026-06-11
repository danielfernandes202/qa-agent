// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  "projectId": "francis-organics-online",
  "appId": "1:571112440296:web:d59820eb6a96970c44a45d",
  "storageBucket": "francis-organics-online.firebasestorage.app",
  "apiKey": "AIzaSyCLQ2VeN6i8M22GxjxNaBLbKxad_u7pLsA",
  "authDomain": "francis-organics-online.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "571112440296"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
