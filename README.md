# 💬 Chat App – Voxella

Real-time aplikacija za dopisivanje razvijena koristeći **React**, **Express**, **MongoDB** i **Socket.IO**.

🔗 **[Live Demo](https://chat-app-voxella-1.onrender.com/)**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/spasojewagner/chat-app-voxella)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green)](https://www.mongodb.com/)

---

## 🚀 Karakteristike

- 🔐 **Registracija i prijava korisnika** - Sigurna autentifikacija sa JWT tokenima
- 💬 **Slanje i prijem poruka u realnom vremenu** - Instant komunikacija
- 🧑‍🤝‍🧑 **Privatni chatovi između korisnika** - Jedan-na-jedan razgovori
- 🌙 **Light/Dark tema** - Prilagodljiv UI za različite preferencije
- 🔄 **Stanje čuvano pomoću Zustand + Redux Persist** - Perzistentni podaci
- 📦 **Prenos fajlova putem Cloudinary** - Upload i deljenje medija
- 📡 **Socket.IO za instant poruke** - Brza i pouzdana komunikacija

---

## 🧠 Tehnologije

### Frontend (`chat-app-frontend`)
- **React 19** + **Vite** - Moderna razvojna platforma
- **Zustand** - Jednostavno upravljanje stanjem
- **TailwindCSS** + **DaisyUI** - Stilizovanje i komponente
- **Socket.IO Client** - Real-time komunikacija
- **Firebase** - Dodatne integracije
- **React Router v7** - Navigacija
- **TanStack Query (React Query)** - Server state management

### Backend (`chat-app-backend`)
- **Node.js** + **Express** - Server i API
- **MongoDB** + **Mongoose** - Baza podataka i ODM
- **Socket.IO** - WebSocket komunikacija
- **Cloudinary** - Cloud storage za medije
- **JWT** - JSON Web Token autentifikacija
- **Multer** - Upload fajlova
- **GridFS** - Čuvanje većih fajlova
- **CORS**, **dotenv**, **cookie-parser** - Middleware i konfiguracija

---

## 📂 Struktura projekta

```bash
📦 chat-app
├── chat-app-backend
│   ├── config/                 # Konfiguracija baze i servisa
│   ├── controllers/            # API kontroleri
│   ├── middleware/             # Middleware funkcije
│   ├── models/                 # MongoDB modeli
│   ├── routes/                 # API rute
│   ├── .env                    # Environment varijable
│   └── index.js                # Entry point
├── chat-app-frontend
│   ├── src/
│   │   ├── assets/             # Statički fajlovi
│   │   ├── components/         # React komponente
│   │   ├── pages/              # Stranice aplikacije
│   │   ├── store/              # Zustand store
│   │   ├── constance/          # Konstante
│   │   └── https/              # HTTP klijent
│   ├── App.jsx                 # Glavna komponenta
│   ├── .env                    # Environment varijable
│   └── vite.config.js          # Vite konfiguracija
```

---

## 🛠️ Pokretanje aplikacije

### Instalacija

Prvo instaliraj sve zavisnosti u oba foldera:

```bash
# Backend
cd chat-app-backend
npm install

# Frontend
cd ../chat-app-frontend
npm install
```

### Pokretanje u development modu

```bash
# Backend server (port 5000)
cd chat-app-backend
npm run dev

# Frontend aplikacija (port 5173)
cd ../chat-app-frontend
npm run dev
```

Aplikacija će biti dostupna na `http://localhost:5173`.

---

## ⚙️ .env konfiguracija

### Backend (`chat-app-backend/.env`)

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Frontend (`chat-app-frontend/.env`)

```env
VITE_BACKEND_URL=http://localhost:5000
```

---

## 🚀 Deployment

Aplikacija je trenutno deployovana na **Render**. Za vlastiti deployment:

1. **Backend**: Deploy na Render, Heroku ili slični servisi
2. **Frontend**: Deploy na Vercel, Netlify ili Render
3. **Baza podataka**: MongoDB Atlas za cloud bazu
4. **Media storage**: Cloudinary account

---

## 📱 Features u razvoju

- [ ] Grupni chatovi
- [ ] Voice poruke
- [ ] Video pozivi
- [ ] Push notifikacije
- [ ] Emoji reakcije
- [ ] Message search
- [ ] User status (online/offline)

---

## 🤝 Doprinošenje

Doprinosi su dobrodošli! Molimo:

1. Fork repozitorijum
2. Kreiraj feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit promene (`git commit -m 'Add some AmazingFeature'`)
4. Push na branch (`git push origin feature/AmazingFeature`)
5. Otvori Pull Request

---

## 👨‍💻 Autor

**@spasojewagner**

- GitHub: [@spasojewagner](https://github.com/spasojewagner)
- LinkedIn: [METODA](https://www.linkedin.com/in/marko-spasojevic-metoda)

---

## 📜 Licenca

Ovaj projekat je licenciran pod MIT licencom - pogledajte [LICENSE](LICENSE) fajl za detalje.

---

## 🙏 Acknowledgments

- React tim za fantastičnu biblioteku
- Socket.IO za real-time funkcionalnost
- MongoDB za fleksibilnu bazu podataka
- Cloudinary za media management
- Tailwind CSS za amazing styling

---

**Napravljen sa ❤️ za bolju komunikaciju**
