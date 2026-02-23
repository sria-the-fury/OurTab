# 🛒 OurTab — Shared Expense & Grocery Tracker

> **OurTab** is a real-time collaborative household expense tracker. Built for housemates and families, it makes splitting grocery bills, tracking who owes what, and managing your shared buy list effortlessly simple.

---

## ✨ Features

### 🔐 Authentication
- **Google Sign-In** via Firebase Authentication
- Protected routes — unauthenticated users are redirected to the login page
- Persistent sessions across page refreshes

### 🏠 House Management
- Create a **named house** and invite members by email
- View all house members with their profile photos
- Collaborative **house deletion** flow: creator initiates, all members must approve before data is wiped
- House creator can cancel a pending deletion at any time

### 📊 Dashboard
A real-time overview of your household finances featuring:
- **Total Expenses** for the current month
- **My Expenses** — your personal spending this month
- **My House** — a quick view of members with their avatars
- **Buy List Preview** — shows your top 3 pending shopping items, clickable to navigate straight to the full list
- **Month Navigation** — arrow buttons to browse previous months' expenses
- **Settlements panel** — shows exactly who owes whom and how much
- **Expense list** — most recent expenses for the month, expand to show all

### 🧾 Shopping / Add Expense
- Build a shopping trip by adding individual **items + prices**
- Add an optional note for the whole trip
- **Split contributions** with housemates — select who contributed and how much
- Auto-fills "Your contribution" as the remaining amount
- One-click **"I Pay All"** or **"Split Equally"** shortcuts
- Generates a beautiful **PDF Expense Report** with settlements and member breakdown (via jsPDF)

### 🛍️ Buy List
- Shared buy list visible to the whole house
- Add items with auto-capitalize on first letter
- **Check off** items when purchased — shows who marked it or **✨ Auto marked** if triggered automatically
- Auto-marking: when an expense is submitted that mentions an item by name, that item is auto-ticked
- Completed items **auto-delete after 12 hours** to keep the list clean
- Completed items cannot be manually deleted or unmarked

### 👤 Profile
- View and manage your account details
- House management — add members, initiate / approve / cancel house deletion
- **Dark / Light theme toggle** (moon/sun icon in the navbar) with preference saved to `localStorage`
- Logout button (only visible on the Profile page)

---

## 📸 Screenshots

### Login Page
![Login Page](screenshots/login.png)

### Dashboard
![Dashboard](screenshots/dashboard.png)

### Buy List
![Buy List](screenshots/buy_list.png)

### Shopping / Add Expense
![Shopping Page](screenshots/shopping.png)

### Profile
![Profile Page](screenshots/profile.png)

---

## 🛠️ Tech Stack

| Category | Package | Notes |
|---|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) | App Router, API Routes, SSR |
| **Language** | TypeScript 5 | End-to-end type safety |
| **UI Library** | [Material UI v7](https://mui.com/) | Components, icons, theming |
| **Styling** | MUI Emotion + Vanilla CSS | Glassmorphism design system |
| **Auth + DB** | [Firebase v12](https://firebase.google.com/) | Auth (Google), Firestore |
| **Data Fetching** | [SWR v2](https://swr.vercel.app/) | React Hooks for data fetching with caching |
| **PDF Generation** | [jsPDF v4](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) | Expense report PDF export |
| **PWA** | [@ducanh2912/next-pwa](https://github.com/DuCanh2912/next-pwa) | Installable as a mobile app |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project with **Firestore** and **Firebase Auth (Google provider)** enabled

### 1. Clone the repo
```bash
git clone https://github.com/your-username/our-tab.git
cd our-tab
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
IREBASE_ADMIN_CREDENTIALS=your_admin_credentials
```

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                  # Next.js API routes (Firestore operations)
│   │   ├── expenses/         # Create, read, update, delete expenses
│   │   ├── houses/           # House management, member add/delete
│   │   └── shopping-todos/   # Buy List CRUD
│   ├── buy-list/             # Buy List page
│   ├── dashboard/            # Dashboard page
│   ├── profile/              # Profile & house management page
│   └── shopping/             # Add Expense / Shopping page
├── components/
│   ├── AuthContext.tsx        # Firebase auth state & user context
│   ├── AuthGuard.tsx          # Route protection wrapper
│   ├── BottomNav.tsx          # Mobile bottom navigation
│   ├── Navbar.tsx             # Top navigation bar with theme toggle
│   ├── ThemeContext.tsx       # Dark/Light mode persistent context
│   └── ThemeRegistry.tsx     # MUI theme provider
├── hooks/
│   ├── useHouseData.ts        # Fetches house, expenses & todos with SWR
│   └── useShoppingTodos.ts    # Fetches and mutates the buy list
└── theme.ts                   # MUI theme factory (light + dark)
```

---

## 🔒 Security

See [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started) — the project uses rules that ensure:
- Only authenticated users can read/write data
- Only house members can access a house's expenses and todos
- Only the expense owner can edit/delete their own expense
- Only the house creator can initiate deletion

---

## 📱 PWA Support

OurTab is configured as a Progressive Web App. Users on mobile can tap **"Add to Home Screen"** to install it as a native-like app.

---

## 📄 License

MIT — feel free to use or fork for your own household!
