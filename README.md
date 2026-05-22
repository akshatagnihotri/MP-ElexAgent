# 🗳️ Madhya Pradesh Election 2023 Dashboard & AI Agent

An interactive, premium single-page web application featuring high-fidelity dark-mode design, dynamic administrative maps, robust Excel/CSV parsing, and an integrated **Election AI Chat Agent** to analyze booth-level voting figures for the **Madhya Pradesh Legislative Assembly Election 2023**.

👉 **Live Demo:** [https://akshatagnihotri.github.io/MP-ElexAgent/](https://akshatagnihotri.github.io/MP-ElexAgent/)

---

## 🛠️ Features

### 1. 📊 Interactive Visual Map & Booth win grid
* **SVG Map of MP**: Hover and click on districts/divisions to filter constituencies dynamically.
* **Booth Win Map (Waffle Grid)**: Micro-square grid representation of every booth. Hovering reveals candidate vote breakdowns and standard victory margin offsets. Click blocks to ask the AI Agent about them!

### 2. ⚡ Real-Time Swing & Turnout Shift Simulator
* **BJP ⇄ INC Swing**: Transfer votes between the two major parties in real-time.
* **Turnout Shift**: Scale voter turnouts up or down.
* **Instant Feedbacks**: All widgets, donut charts, area trajectories, tables, and AI Agent responses recalculate instantly with true multi-candidate winner-vs-runner-up formulas.

### 3. 🤖 In-Browser AI NLP Solver (Local Agent)
* Query the dataset naturally! Ask questions like:
  * *"Who won booth 45?"*
  * *"Which booth has the highest victory margin?"*
  * *"Show me BJP vs INC overall wins summary"*
  * *"List the top 5 bjp strong booths"*
* Features custom HTML report rendering, loading reasoning bubbles, and Saffron/Green victory confetti celebrations!

### 4. 🗃️ Complete 230 Constituency Database
* Preloaded with all 230 constituency Form 20 Excel files extracted from raw Election Commission data. Zero manual file uploads required!

---

## 🚀 How to Run Locally

1. Clone this repository:
   ```bash
   git clone https://github.com/akshatagnihotri/MP-ElexAgent.git
   cd MP-ElexAgent
   ```
2. Double-click the **`start_server.bat`** file on Windows. This automatically launches a lightweight Python HTTP server on port 8000 and opens the browser playground:
   ```url
   http://localhost:8000
   ```
