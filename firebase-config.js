// Firebase project: asalo-logistics
const firebaseConfig = {
  apiKey: "AIzaSyAC84_f3hlHq1Lhzg8YJvoJBvGj70wtafY",
  authDomain: "asalo-logistics.firebaseapp.com",
  projectId: "asalo-logistics",
  storageBucket: "asalo-logistics.firebasestorage.app",
  messagingSenderId: "983179082844",
  appId: "1:983179082844:web:2446d1196dc0e48427ba99"
};

firebase.initializeApp(firebaseConfig);
window.db = firebase.firestore();
