/* 
  =========================================
  Madhya Pradesh Election 2023 Dashboard
  Core Application Logic & Local AI Agent
  =========================================
*/

// --- Global Application State ---
const state = {
  activeDivision: 'all',
  activeConstituency: '',
  activeFilePath: '',    // File path of preloaded Excel sheets
  allBoothData: [],      // Standardized booth array
  filteredBoothData: [], // Filtered array based on search/party filters
  mappedColumns: {},     // User column mapping
  excelRawHeaders: [],   // Raw headers from uploaded sheet
  excelRawRows: [],      // Raw rows from uploaded sheet
  constituencyIndex: {}, // Loaded dynamically from constituency_index.json
  uploadedFilename: '',
  
  // Table Pagination
  currentPage: 1,
  pageSize: 10,
  
  // Chart Instances
  charts: {
    voteShare: null,
    leadTrajectory: null
  }
};

// --- Initialize Lucide Icons & Dynamic Data Loading ---
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  
  // Load the 230 constituency files database dynamically!
  loadConstituencyDatabase();
  setupEventListeners();
  
  // Create beautiful initial empty charts
  renderEmptyCharts();
});

// --- Fetch Constituency JSON Index ---
async function loadConstituencyDatabase() {
  try {
    const response = await fetch('./constituency_index.json');
    if (!response.ok) throw new Error("Could not load index");
    
    state.constituencyIndex = await response.json();
    console.log("Successfully loaded 230 MP Constituency database!", state.constituencyIndex);
    
    // Populate dropdown dynamically based on JSON index
    populateConstituencies();
    showToast("Loaded 230 Assembly files database!");
    
    addAgentChatMessage(`
      <p>⚡ <strong>Madhya Pradesh Election Database Connected!</strong></p>
      <p>I have successfully connected to the complete <strong>230 Assembly Constituencies database</strong> (8 divisions) that was extracted from your zip file!</p>
      <p><strong>You don't need to manually upload anything!</strong> Simply:</p>
      <ol style="margin: 6px 0; padding-left: 20px">
        <li>Click a division on the map (or select it from the sidebar dropdown).</li>
        <li>Select your desired constituency from the selector.</li>
        <li>The system will automatically download and parse the Form 20 Excel sheet!</li>
      </ol>
      <p>You can still drag-and-drop any custom file at any time!</p>
    `);
    
  } catch (err) {
    console.warn("Constituency index not found. Falling back to manual upload mode.", err);
    // Populate fallback mock names
    populateFallbackConstituencies();
  }
}

// --- Populate Constituency Dropdown dynamically from JSON ---
function populateConstituencies() {
  const selector = document.getElementById("constituency-selector");
  selector.innerHTML = '<option value="">-- Select Constituency --</option>';
  
  if (Object.keys(state.constituencyIndex).length === 0) {
    populateFallbackConstituencies();
    return;
  }
  
  if (state.activeDivision === 'all') {
    // Populate all constituencies grouped by division from JSON index
    for (const division in state.constituencyIndex) {
      const optGroup = document.createElement("optgroup");
      optGroup.label = `${division} Division`;
      state.constituencyIndex[division].forEach(con => {
        const opt = document.createElement("option");
        opt.value = con.name;
        opt.dataset.file = con.file;
        opt.textContent = con.name;
        optGroup.appendChild(opt);
      });
      selector.appendChild(optGroup);
    }
  } else {
    // Populate constituencies for active division only from JSON index
    const list = state.constituencyIndex[state.activeDivision] || [];
    list.forEach(con => {
      const opt = document.createElement("option");
      opt.value = con.name;
      opt.dataset.file = con.file;
      opt.textContent = con.name;
      selector.appendChild(opt);
    });
  }
}

// --- Fallback Constituencies List if JSON is missing ---
function populateFallbackConstituencies() {
  const constituenciesData = {
    Bhopal: ["Bhopal Madhya", "Bhopal Uttar", "Bhopal Dakshin-Pashchim", "Huzur", "Berasia", "Sehore", "Ashta", "Vidisha", "Raisen"],
    Indore: ["Indore-1", "Indore-2", "Indore-3", "Indore-4", "Indore-5", "Rau", "Mhow", "Sanwer", "Dhar", "Khargone", "Barwani", "Khandwa"],
    Gwalior: ["Gwalior", "Gwalior East", "Gwalior South", "Dabra", "Bhind", "Morena", "Datia", "Shivpuri", "Guna"],
    Jabalpur: ["Jabalpur Cantonment", "Jabalpur East", "Jabalpur North", "Jabalpur West", "Katni", "Chhindwara", "Seoni", "Mandla", "Balaghat"]
  };
  
  const selector = document.getElementById("constituency-selector");
  selector.innerHTML = '<option value="">-- Select Constituency --</option>';
  
  for (const division in constituenciesData) {
    const optGroup = document.createElement("optgroup");
    optGroup.label = `${division} Division`;
    constituenciesData[division].forEach(con => {
      const opt = document.createElement("option");
      opt.value = con;
      opt.textContent = con;
      optGroup.appendChild(opt);
    });
    selector.appendChild(optGroup);
  }
}

// --- Setup Event Listeners ---
function setupEventListeners() {
  // District/Division Selector dropdown change
  document.getElementById("district-selector").addEventListener("change", (e) => {
    state.activeDivision = e.target.value;
    populateConstituencies();
    updateMapHighlight();
  });
  
  // Constituency Selector dropdown change
  document.getElementById("constituency-selector").addEventListener("change", (e) => {
    const selectedOption = e.target.options[e.target.selectedIndex];
    state.activeConstituency = e.target.value;
    state.activeFilePath = selectedOption.dataset.file || '';
    
    updateConstituencyTitle();
    
    // Automatically load the preloaded Excel sheet from local server if available!
    if (state.activeFilePath) {
      loadExcelFromServer(state.activeFilePath, state.activeConstituency);
    }
  });
  
  // SVG Map District clicks
  document.querySelectorAll(".map-district").forEach(path => {
    path.addEventListener("click", () => {
      const divName = path.getAttribute("data-division");
      
      // Toggle highlight
      document.querySelectorAll(".map-district").forEach(p => p.classList.remove("active"));
      path.classList.add("active");
      
      // Update sidebar state
      state.activeDivision = divName;
      document.getElementById("district-selector").value = divName;
      populateConstituencies();
      
      showToast(`Active Region: ${path.getAttribute("data-name")}`);
    });
    
    // Map Tooltip interactions
    const tooltip = document.getElementById("map-tooltip");
    path.addEventListener("mousemove", (e) => {
      tooltip.textContent = path.getAttribute("data-name");
      tooltip.style.display = "block";
      tooltip.style.left = (e.pageX - 20) + "px";
      tooltip.style.top = (e.pageY - 40) + "px";
    });
    
    path.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });
  });
  
  // Drag and drop events for uploader zone
  const uploader = document.getElementById("file-uploader");
  const fileInput = document.getElementById("file-input");
  
  uploader.addEventListener("click", () => fileInput.click());
  
  uploader.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploader.classList.add("dragover");
  });
  
  uploader.addEventListener("dragleave", () => {
    uploader.classList.remove("dragover");
  });
  
  uploader.addEventListener("drop", (e) => {
    e.preventDefault();
    uploader.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      handleUploadedFile(e.dataTransfer.files[0]);
    }
  });
  
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleUploadedFile(e.target.files[0]);
    }
  });
  
  // Modal Close buttons
  document.getElementById("close-modal-btn").addEventListener("click", hideMappingModal);
  document.getElementById("apply-mapping-btn").addEventListener("click", applySchemaMapping);
  
  // Table Search and Party Filter controls
  document.getElementById("booth-search-input").addEventListener("input", filterAndRenderTable);
  document.getElementById("booth-party-filter").addEventListener("change", filterAndRenderTable);
  
  // Pagination controls
  document.getElementById("prev-page-btn").addEventListener("click", () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderBoothTable();
    }
  });
  
  document.getElementById("next-page-btn").addEventListener("click", () => {
    const totalPages = Math.ceil(state.filteredBoothData.length / state.pageSize);
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderBoothTable();
    }
  });
  
  // AI Chat controls
  document.getElementById("chat-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleUserChatMessage();
  });
  document.getElementById("chat-send-btn").addEventListener("click", handleUserChatMessage);
  
  // Chat Suggestion buttons
  document.querySelectorAll(".suggestion-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const query = btn.getAttribute("data-query");
      submitChatQuery(query);
    });
  });
  
  // Map Card Tab Switching
  const tabMpMap = document.getElementById("tab-mp-map");
  const tabBoothGrid = document.getElementById("tab-booth-grid");
  const mpMapContainer = document.getElementById("mp-map-container");
  const boothGridContainer = document.getElementById("booth-grid-container");
  
  if (tabMpMap && tabBoothGrid && mpMapContainer && boothGridContainer) {
    tabMpMap.addEventListener("click", () => {
      tabMpMap.classList.add("active");
      tabBoothGrid.classList.remove("active");
      mpMapContainer.style.display = "flex";
      boothGridContainer.style.display = "none";
      showToast("Switched to MP Divisions Map view!");
    });
    
    tabBoothGrid.addEventListener("click", () => {
      tabBoothGrid.classList.add("active");
      tabMpMap.classList.remove("active");
      mpMapContainer.style.display = "none";
      boothGridContainer.style.display = "flex";
      // Render waffle grid when switched to ensure it displays properly
      renderWaffleGrid();
      showToast("Switched to Booth Win Map grid!");
    });
  }
  
  // Swing & Turnout Simulator Sliders
  const swingSlider = document.getElementById("swing-slider");
  const turnoutSlider = document.getElementById("turnout-slider");
  if (swingSlider && turnoutSlider) {
    swingSlider.addEventListener("input", handleSimulatorChange);
    turnoutSlider.addEventListener("input", handleSimulatorChange);
  }
  
  // Reset Button
  document.getElementById("reset-btn").addEventListener("click", resetDashboard);
}

// --- Fetch preloaded Excel file directly from local server ---
async function loadExcelFromServer(filepath, constituencyName) {
  showToast(`Downloading Form 20 for ${constituencyName}...`);
  
  try {
    const response = await fetch(filepath);
    if (!response.ok) throw new Error("File fetch failed");
    
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Parse sheet as raw matrix (array of arrays) for smart header inspection
    const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rawMatrix.length < 2) {
      showToast("The sheet is empty or contains insufficient rows!", "error");
      return;
    }
    
    const filename = filepath.split('/').pop();
    processRawSpreadsheet(rawMatrix, filename);
    
  } catch (err) {
    console.error("Error fetching Excel file:", err);
    showToast("Error loading file from server database.", "error");
  }
}

// --- Map Sync Dropdown Highlight ---
function updateMapHighlight() {
  document.querySelectorAll(".map-district").forEach(path => {
    const div = path.getAttribute("data-division");
    if (state.activeDivision === div) {
      path.classList.add("active");
    } else {
      path.classList.remove("active");
    }
  });
}

// --- Update Active Constituency Display Title ---
function updateConstituencyTitle() {
  const title = document.getElementById("constituency-display-title");
  const subtitle = document.getElementById("constituency-display-subtitle");
  
  if (state.activeConstituency) {
    title.textContent = `${state.activeConstituency}`;
    subtitle.textContent = `Voter booths and candidate vote counts visualizer`;
  } else {
    title.textContent = `Madhya Pradesh Overview`;
    subtitle.textContent = `Select a constituency and upload Form 20 data to begin booth analysis`;
  }
}

// --- File Uploading Handler (Drag and Drop) ---
function handleUploadedFile(file) {
  if (!state.activeConstituency) {
    showToast("Please select a Constituency first!", "error");
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const binaryStr = e.target.result;
    try {
      const workbook = XLSX.read(binaryStr, { type: 'binary' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Parse sheet as raw matrix (array of arrays) for smart header inspection
      const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (rawMatrix.length < 2) {
        showToast("The sheet is empty or contains insufficient rows!", "error");
        return;
      }
      
      // Store raw details
      processRawSpreadsheet(rawMatrix, file.name);
      
    } catch (err) {
      console.error(err);
      showToast("Error reading the Excel or CSV file. Ensure it is valid.", "error");
    }
  };
  reader.readAsBinaryString(file);
}

// --- Process Raw Rows & Autodetect Columns Mapping ---
function processRawSpreadsheet(matrix, filename) {
  // Find standard header row. Usually headers contain strings like "booth", "polling", "bjp", "inc", "total".
  let headerIndex = 0;
  for (let i = 0; i < Math.min(10, matrix.length); i++) {
    const row = matrix[i];
    if (row && row.some(cell => typeof cell === 'string' && 
        (cell.toLowerCase().includes("booth") || 
         cell.toLowerCase().includes("polling") || 
         cell.toLowerCase().includes("station") ||
         cell.toLowerCase().includes("total") ||
         cell.toLowerCase().includes("bjp") ||
         cell.toLowerCase().includes("inc")))) {
      headerIndex = i;
      break;
    }
  }
  
  const headers = matrix[headerIndex].map(h => String(h || '').trim());
  const rows = matrix.slice(headerIndex + 1);
  
  state.excelRawHeaders = headers;
  state.excelRawRows = rows;
  
  // Show UI mapper with auto-mapped selections
  showMappingModal(headers, filename);
}

// --- Display Columns Schema Modal ---
function showMappingModal(headers, filename) {
  const modal = document.getElementById("mapping-modal");
  
  // Populate dropdown lists inside the modal
  const dropdownIds = [
    "map-booth-name", "map-bjp-votes", "map-inc-votes", 
    "map-other-votes", "map-nota-votes", "map-total-votes"
  ];
  
  dropdownIds.forEach(id => {
    const select = document.getElementById(id);
    select.innerHTML = '<option value="">-- Choose Column --</option>';
    headers.forEach((h, index) => {
      const opt = document.createElement("option");
      opt.value = index;
      opt.textContent = `${h} (Col ${index + 1})`;
      select.appendChild(opt);
    });
  });
  
  // Smart Autodetect algorithms
  autoSelectColumn("map-booth-name", headers, ["booth", "polling", "station", "building", "name", "desc", "center"]);
  
  // BJP Candidates matching: BJP candidate names in 2023 or standard BJP abbreviations
  autoSelectColumn("map-bjp-votes", headers, ["bjp", "saffron", "bhartiya", "janata", "b.j.p", "b j p", "dhruv", "narayan", "singh", "tomar", "scindia", "chouhan", "patel"]);
  
  // INC Candidates matching: INC candidate names or standard INC abbreviations
  autoSelectColumn("map-inc-votes", headers, ["inc", "congress", "indian national", "i.n.c", "i n c", "arif", "masood", "digvijay", "kamal", "nath", "sahu"]);
  
  autoSelectColumn("map-nota-votes", headers, ["nota", "none of the", "none"]);
  autoSelectColumn("map-total-votes", headers, ["total", "votes polled", "grand total", "valid"]);
  autoSelectColumn("map-other-votes", headers, ["other", "bsp", "independent", "ind", "others"]);
  
  // Smart Fallback mapping: If BJP/INC were not autodetected, assign standard column indexes!
  // In standard Form 20 sheets, Col 1 is Booth No, Col 2 is Booth Name, and Candidate columns follow.
  const bjpSelect = document.getElementById("map-bjp-votes");
  const incSelect = document.getElementById("map-inc-votes");
  const nameSelect = document.getElementById("map-booth-name");
  const totalSelect = document.getElementById("map-total-votes");
  
  if (nameSelect.value === "" && headers.length > 1) nameSelect.value = "1"; // Col 2 is name
  if (bjpSelect.value === "" && headers.length > 2) bjpSelect.value = "2"; // Col 3 is BJP
  if (incSelect.value === "" && headers.length > 3) incSelect.value = "3"; // Col 4 is INC
  if (totalSelect.value === "") {
    // In many Form 20s, the second-to-last column is Total Valid Votes
    if (headers.length > 4) {
      totalSelect.value = String(headers.length - 3); // Standard total index guess
    }
  }
  
  modal.classList.add("active");
  state.uploadedFilename = filename;
}

// --- Autoselect dropdown values based on similarity ---
function autoSelectColumn(dropdownId, headers, keywords) {
  const select = document.getElementById(dropdownId);
  for (let i = 0; i < headers.length; i++) {
    const headerLower = headers[i].toLowerCase();
    if (keywords.some(kw => headerLower.includes(kw))) {
      select.value = i;
      break;
    }
  }
}

function hideMappingModal() {
  document.getElementById("mapping-modal").classList.remove("active");
}

// --- Apply Mapped Columns & Standardize Dataset ---
function applySchemaMapping() {
  const boothNameCol = parseInt(document.getElementById("map-booth-name").value);
  const bjpVotesCol = parseInt(document.getElementById("map-bjp-votes").value);
  const incVotesCol = parseInt(document.getElementById("map-inc-votes").value);
  const otherVotesCol = parseInt(document.getElementById("map-other-votes").value);
  const notaVotesCol = parseInt(document.getElementById("map-nota-votes").value);
  const totalVotesCol = parseInt(document.getElementById("map-total-votes").value);
  
  if (isNaN(boothNameCol) || isNaN(bjpVotesCol) || isNaN(incVotesCol) || isNaN(totalVotesCol)) {
    showToast("Please map at least Polling Station Name, BJP, INC, and Total Votes columns!", "error");
    return;
  }
  
  // Extract candidate names from mapped headers to make chat replies extremely realistic!
  state.mappedColumns = {
    bjpName: state.excelRawHeaders[bjpVotesCol] || "BJP Candidate",
    incName: state.excelRawHeaders[incVotesCol] || "INC Candidate",
    otherName: isNaN(otherVotesCol) ? "Others" : (state.excelRawHeaders[otherVotesCol] || "Others")
  };
  
  // Generate Standardized array
  const formattedBooths = [];
  let indexCounter = 1;
  
  state.excelRawRows.forEach(row => {
    // Basic verification: skip rows that represent summary sheets (Total / Grand Total / Empty booth cell)
    const boothName = String(row[boothNameCol] || '').trim();
    if (!boothName || boothName.toLowerCase().includes("total") || boothName.toLowerCase().includes("grand") || boothName.toLowerCase().includes("sum") || boothName.toLowerCase().includes("nps")) {
      return;
    }
    
    const bjpVotes = parseInt(row[bjpVotesCol]) || 0;
    const incVotes = parseInt(row[incVotesCol]) || 0;
    const otherVotes = isNaN(otherVotesCol) ? 0 : (parseInt(row[otherVotesCol]) || 0);
    const notaVotes = isNaN(notaVotesCol) ? 0 : (parseInt(row[notaVotesCol]) || 0);
    const totalVotes = parseInt(row[totalVotesCol]) || (bjpVotes + incVotes + otherVotes + notaVotes);
    
    let winner = 'OTHER';
    let margin = 0;
    
    if (bjpVotes > incVotes && bjpVotes > otherVotes) {
      winner = 'BJP';
      margin = bjpVotes - Math.max(incVotes, otherVotes);
    } else if (incVotes > bjpVotes && incVotes > otherVotes) {
      winner = 'INC';
      margin = incVotes - Math.max(bjpVotes, otherVotes);
    } else {
      winner = 'OTHER';
      margin = otherVotes - Math.max(bjpVotes, incVotes);
    }
    
    // Set a realistic turnout base size if registered voters are not specified
    const turnoutEstVal = totalVotes > 0 ? (totalVotes / 0.77).toFixed(0) : 1000;
    
    formattedBooths.push({
      boothNumber: indexCounter++,
      boothName: boothName,
      bjpVotes: bjpVotes,
      incVotes: incVotes,
      otherVotes: otherVotes,
      notaVotes: notaVotes,
      totalVotes: totalVotes,
      registeredEst: parseInt(turnoutEstVal),
      winner: winner,
      margin: margin
    });
  });
  
  state.allBoothData = formattedBooths;
  state.filteredBoothData = [...formattedBooths];
  state.currentPage = 1;
  
  hideMappingModal();
  
  // Activate UI items
  document.getElementById("file-meta-container").style.display = "block";
  document.getElementById("loaded-filename").textContent = state.uploadedFilename;
  document.getElementById("chat-input").removeAttribute("disabled");
  document.getElementById("chat-send-btn").removeAttribute("disabled");
  document.getElementById("chat-suggestions-box").style.display = "flex";
  document.getElementById("simulator-container").style.display = "block";
  
  // Hide chart placeholders
  const voteShareOverlay = document.getElementById("vote-share-overlay");
  const trajectoryOverlay = document.getElementById("trajectory-overlay");
  if (voteShareOverlay) voteShareOverlay.classList.add("hidden");
  if (trajectoryOverlay) trajectoryOverlay.classList.add("hidden");
  
  // Rerender analytics, tables & charts
  updateDashboardMetrics();
  filterAndRenderTable();
  renderAnalyticalCharts();
  renderWaffleGrid();
  
  // Confetti victory explosion!
  triggerVictoryConfetti();
  
  // Find which candidate won constituency
  let overallBjp = 0;
  let overallInc = 0;
  getWorkingDataset().forEach(b => {
    overallBjp += b.bjpVotes;
    overallInc += b.incVotes;
  });
  
  const overallWinner = overallBjp > overallInc ? 'BJP' : 'INC';
  const overallMargin = Math.abs(overallBjp - overallInc);
  const winnerColorStyle = overallWinner === 'BJP' ? 'color: var(--color-bjp)' : 'color: var(--color-inc)';
  
  // Prompt Chat Agent success
  addAgentChatMessage(`
    <p>🎉 <strong>Form 20 Data parsed successfully!</strong></p>
    <p>Loaded <strong>${formattedBooths.length} Polling Stations</strong> for the <strong>${state.activeConstituency}</strong> constituency.</p>
    <p>🏆 Constituency Winner: <strong style="${winnerColorStyle}">${overallWinner} (${overallWinner === 'BJP' ? state.mappedColumns.bjpName : state.mappedColumns.incName})</strong> leading by <span class="stat-value">${overallMargin.toLocaleString()} votes</span>.</p>
    <p>I have fully updated the graphs and visualizers! You can now ask me detailed analytical questions about individual booth voting figures.</p>
  `);
}

// --- Update Top Level Cards Metrics ---
function updateDashboardMetrics() {
  let totalBjp = 0;
  let totalInc = 0;
  let totalOthers = 0;
  let totalNota = 0;
  let totalVotes = 0;
  let totalRegistered = 0;
  
  getWorkingDataset().forEach(b => {
    totalBjp += b.bjpVotes;
    totalInc += b.incVotes;
    totalOthers += b.otherVotes;
    totalNota += b.notaVotes;
    totalVotes += b.totalVotes;
    totalRegistered += b.registeredEst;
  });
  
  const turnoutPercent = totalRegistered > 0 ? ((totalVotes / totalRegistered) * 100).toFixed(2) : "0.00";
  
  document.getElementById("metric-total-voters").textContent = totalVotes.toLocaleString();
  document.getElementById("metric-turnout").textContent = `${turnoutPercent}%`;
  
  let leaderText = "-";
  const winnerIconBox = document.getElementById("winner-icon-box");
  
  const overallSorted = [
    { party: 'BJP', votes: totalBjp, color: 'var(--color-bjp)', bg: 'rgba(255, 153, 51, 0.15)' },
    { party: 'INC', votes: totalInc, color: 'var(--color-inc)', bg: 'rgba(19, 136, 8, 0.15)' },
    { party: 'Others', votes: totalOthers, color: 'var(--accent-cyan)', bg: 'rgba(6, 182, 212, 0.15)' }
  ].sort((a, b) => b.votes - a.votes);
  
  const overallWinner = overallSorted[0].party;
  const overallMargin = overallSorted[0].votes - overallSorted[1].votes;
  
  if (overallMargin === 0) {
    leaderText = "Tied Race";
    winnerIconBox.style.color = "var(--text-main)";
    winnerIconBox.style.background = "rgba(255, 255, 255, 0.1)";
  } else {
    leaderText = `${overallWinner} Lead (+${overallMargin.toLocaleString()})`;
    winnerIconBox.style.color = overallSorted[0].color;
    winnerIconBox.style.background = overallSorted[0].bg;
  }
  
  document.getElementById("metric-winner").textContent = leaderText;
}

// --- Filter Booth Table rows ---
function filterAndRenderTable() {
  const query = document.getElementById("booth-search-input").value.toLowerCase().trim();
  const partyFilter = document.getElementById("booth-party-filter").value;
  
  state.filteredBoothData = getWorkingDataset().filter(b => {
    const matchesSearch = b.boothName.toLowerCase().includes(query) || 
                          String(b.boothNumber).includes(query) ||
                          b.winner.toLowerCase().includes(query);
                          
    const matchesParty = partyFilter === 'all' || 
                         (partyFilter === 'BJP' && b.winner === 'BJP') ||
                         (partyFilter === 'INC' && b.winner === 'INC') ||
                         (partyFilter === 'OTHER' && b.winner === 'OTHER');
                         
    return matchesSearch && matchesParty;
  });
  
  state.currentPage = 1;
  renderBoothTable();
}

// --- Render paginated Polling Booth table ---
function renderBoothTable() {
  const tbody = document.getElementById("booth-table-body");
  tbody.innerHTML = "";
  
  if (state.filteredBoothData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 40px">
          <i data-lucide="alert-circle" style="display:inline-block; vertical-align:middle; margin-right:8px"></i>
          No matching polling stations found
        </td>
      </tr>
    `;
    lucide.createIcons();
    updatePaginationUI();
    return;
  }
  
  const start = (state.currentPage - 1) * state.pageSize;
  const end = Math.min(start + state.pageSize, state.filteredBoothData.length);
  const paginatedList = state.filteredBoothData.slice(start, end);
  
  paginatedList.forEach(b => {
    const tr = document.createElement("tr");
    tr.className = b.winner === 'BJP' ? 'winner-row-bjp' : (b.winner === 'INC' ? 'winner-row-inc' : 'winner-row-other');
    
    const partyTagClass = b.winner === 'BJP' ? 'party-tag-bjp' : (b.winner === 'INC' ? 'party-tag-inc' : 'party-tag-other');
    
    // Calculate margins for each candidate relative to the winner
    const winVotes = Math.max(b.bjpVotes, b.incVotes, b.otherVotes);
    
    // Suffix margin tags
    const bjpMarginVal = b.bjpVotes - winVotes;
    const incMarginVal = b.incVotes - winVotes;
    const otherMarginVal = b.otherVotes - winVotes;
    
    const bjpMarginTag = bjpMarginVal === 0 
      ? `<div style="font-size: 0.65rem; color: #10b981; font-weight: 700; margin-top: 2px;">🏆 Lead +${b.margin.toLocaleString()}</div>`
      : `<div style="font-size: 0.65rem; color: #ef4444; font-weight: 500; margin-top: 2px;">${bjpMarginVal.toLocaleString()}</div>`;
      
    const incMarginTag = incMarginVal === 0 
      ? `<div style="font-size: 0.65rem; color: #10b981; font-weight: 700; margin-top: 2px;">🏆 Lead +${b.margin.toLocaleString()}</div>`
      : `<div style="font-size: 0.65rem; color: #ef4444; font-weight: 500; margin-top: 2px;">${incMarginVal.toLocaleString()}</div>`;
      
    const otherMarginTag = otherMarginVal === 0 
      ? `<div style="font-size: 0.65rem; color: #10b981; font-weight: 700; margin-top: 2px;">🏆 Lead +${b.margin.toLocaleString()}</div>`
      : `<div style="font-size: 0.65rem; color: #ef4444; font-weight: 500; margin-top: 2px;">${otherMarginVal.toLocaleString()}</div>`;
      
    tr.innerHTML = `
      <td><strong>#${b.boothNumber}</strong></td>
      <td>${b.boothName}</td>
      <td style="color: var(--color-bjp); font-weight:700; vertical-align: top;">
        ${b.bjpVotes.toLocaleString()}
        ${bjpMarginTag}
      </td>
      <td style="color: var(--color-inc); font-weight:700; vertical-align: top;">
        ${b.incVotes.toLocaleString()}
        ${incMarginTag}
      </td>
      <td style="vertical-align: top;">
        ${b.otherVotes.toLocaleString()}
        ${otherMarginTag}
      </td>
      <td style="vertical-align: top;">${b.notaVotes.toLocaleString()}</td>
      <td style="font-weight:700; vertical-align: top;">${b.totalVotes.toLocaleString()}</td>
      <td style="vertical-align: top;"><span class="party-tag ${partyTagClass}">${b.winner}</span></td>
      <td style="vertical-align: top;"><strong>+${b.margin.toLocaleString()}</strong></td>
    `;
    
    tbody.appendChild(tr);
  });
  
  updatePaginationUI();
}

// --- Update Pagination Buttons & Info Strip ---
function updatePaginationUI() {
  const totalItems = state.filteredBoothData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / state.pageSize));
  const start = totalItems === 0 ? 0 : (state.currentPage - 1) * state.pageSize + 1;
  const end = Math.min(start + state.pageSize - 1, totalItems);
  
  document.getElementById("table-pagination-info").textContent = `Showing ${start} to ${end} of ${totalItems} booths`;
  
  document.getElementById("prev-page-btn").disabled = state.currentPage === 1;
  document.getElementById("next-page-btn").disabled = state.currentPage === totalPages;
}

// --- Render Empty Charts initially ---
function renderEmptyCharts() {
  // Empty Vote Share donut
  const shareOptions = {
    series: [],
    labels: [],
    colors: ['#ff9933', '#138808', '#64748b'],
    chart: { type: 'donut', height: 260, foreColor: '#94a3b8' },
    legend: { position: 'bottom' },
    noData: {
      text: 'Awaiting Data',
      align: 'center',
      verticalAlign: 'middle',
      style: {
        color: '#94a3b8',
        fontSize: '14px',
        fontFamily: 'Outfit'
      }
    }
  };
  state.charts.voteShare = new ApexCharts(document.querySelector("#vote-share-chart"), shareOptions);
  state.charts.voteShare.render();
  
  // Empty Cumulative Lead Trajectory
  const leadOptions = {
    series: [],
    chart: { type: 'area', height: 260, toolbar: { show: false }, foreColor: '#94a3b8' },
    colors: ['#ff9933', '#138808'],
    stroke: { curve: 'smooth', width: 2.5 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.15, opacityTo: 0.02 } },
    dataLabels: { enabled: false },
    noData: {
      text: 'Awaiting Data',
      align: 'center',
      verticalAlign: 'middle',
      style: {
        color: '#94a3b8',
        fontSize: '14px',
        fontFamily: 'Outfit'
      }
    },
    xaxis: { categories: [], title: { text: 'Booths Sorted Sequentially' } },
    yaxis: { title: { text: 'Cumulative Votes' } }
  };
  state.charts.leadTrajectory = new ApexCharts(document.querySelector("#lead-trajectory-chart"), leadOptions);
  state.charts.leadTrajectory.render();
}

// --- Render High Fidelity Charts on Parsed Data ---
function renderAnalyticalCharts() {
  let totalBjp = 0;
  let totalInc = 0;
  let totalOthers = 0;
  let totalNota = 0;
  
  // Generate Cumulative Vote Progression
  let cumulativeBjp = 0;
  let cumulativeInc = 0;
  const trajectoryBjpData = [];
  const trajectoryIncData = [];
  const trajectoryCategories = [];
  
  const workingData = getWorkingDataset();
  
  workingData.forEach((b, idx) => {
    totalBjp += b.bjpVotes;
    totalInc += b.incVotes;
    totalOthers += b.otherVotes;
    totalNota += b.notaVotes;
    
    // BJP & INC cumulative totals
    cumulativeBjp += b.bjpVotes;
    cumulativeInc += b.incVotes;
    trajectoryBjpData.push(cumulativeBjp);
    trajectoryIncData.push(cumulativeInc);
    
    // Sampling X-Axis labels to keep it crisp
    if (workingData.length < 30 || idx % Math.ceil(workingData.length / 10) === 0) {
      trajectoryCategories.push(`B${b.boothNumber}`);
    } else {
      trajectoryCategories.push('');
    }
  });
  
  // Update Vote Share Donut
  state.charts.voteShare.updateOptions({
    series: [totalBjp, totalInc, totalOthers, totalNota],
    labels: ['BJP', 'INC', 'Others', 'NOTA'],
    colors: ['#ff9933', '#138808', '#06b6d4', '#64748b'],
    plotOptions: {
      donut: {
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Total Polled',
            formatter: (w) => {
              return w.globals.seriesTotals.reduce((a, b) => a + b, 0).toLocaleString();
            }
          }
        }
      }
    },
    tooltip: { enabled: true, y: { formatter: (val) => val.toLocaleString() } }
  });
  
  // Render Dynamic Donut Card Margin Summary
  const totalVotes = totalBjp + totalInc + totalOthers + totalNota;
  
  const overallSorted = [
    { party: 'BJP', votes: totalBjp, color: 'var(--color-bjp)', glow: 'rgba(255, 153, 51, 0.15)', text: '#ff9933', name: state.mappedColumns.bjpName || 'BJP' },
    { party: 'INC', votes: totalInc, color: 'var(--color-inc)', glow: 'rgba(19, 136, 8, 0.15)', text: '#138808', name: state.mappedColumns.incName || 'INC' },
    { party: 'Others', votes: totalOthers, color: 'var(--accent-cyan)', glow: 'rgba(6, 182, 212, 0.15)', text: '#06b6d4', name: state.mappedColumns.otherName || 'Others' },
    { party: 'NOTA', votes: totalNota, color: 'var(--text-muted)', glow: 'rgba(148, 163, 184, 0.15)', text: '#64748b', name: 'None of the Above' }
  ].sort((a, b) => b.votes - a.votes);
  
  const overallWinner = overallSorted[0].party;
  const overallMargin = overallSorted[0].votes - overallSorted[1].votes;
  const marginPercent = totalVotes > 0 ? (overallMargin / totalVotes * 100).toFixed(1) : "0.0";
  const winnerColor = overallSorted[0].color;
  
  const marginAnalysisEl = document.getElementById("donut-margin-analysis");
  if (marginAnalysisEl) {
    marginAnalysisEl.style.display = "block";
    
    let gridCardsHtml = '';
    overallSorted.forEach((item, index) => {
      const share = totalVotes > 0 ? ((item.votes / totalVotes) * 100).toFixed(1) : "0.0";
      let marginText = '';
      let badgeStyle = '';
      
      if (index === 0) {
        marginText = `<span style="color:#10b981; font-weight:800; font-size:0.65rem;">🏆 LEADER</span>`;
        badgeStyle = `border: 1px solid ${item.color}; box-shadow: 0 0 10px ${item.glow};`;
      } else {
        const diff = item.votes - overallSorted[0].votes;
        const diffPercent = totalVotes > 0 ? (diff / totalVotes * 100).toFixed(1) : "0.0";
        marginText = `<span style="color:#ef4444; font-weight:600; font-size:0.65rem;">${diff.toLocaleString()} (${diffPercent}%)</span>`;
        badgeStyle = `border: 1px solid rgba(255,255,255,0.06);`;
      }
      
      gridCardsHtml += `
        <div style="background:rgba(15, 23, 42, 0.45); padding:10px; border-radius:10px; text-align:center; display:flex; flex-direction:column; justify-content:space-between; min-height:85px; ${badgeStyle}">
          <span style="color:${item.text}; font-weight:700; font-size:0.75rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.name}">${item.party}</span>
          <strong style="color:var(--text-main); font-size:0.9rem; display:block; margin:2px 0;">${item.votes.toLocaleString()}</strong>
          <div style="font-size:0.65rem; color:var(--text-muted); margin-bottom:2px;">Share: ${share}%</div>
          <div>${marginText}</div>
        </div>
      `;
    });
    
    marginAnalysisEl.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; margin-bottom:12px;">
        <span style="color:var(--text-muted); font-weight:600">Victory Margin:</span>
        <span style="font-weight:700; color:${winnerColor}">${overallWinner} Lead (+${overallMargin.toLocaleString()} votes / ${marginPercent}%)</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.7rem; color:var(--text-muted);">
        ${gridCardsHtml}
      </div>
    `;
  }
  
  // Update Lead Trajectory Chart to Cumulative Vote Progression
  state.charts.leadTrajectory.updateOptions({
    series: [
      {
        name: `${state.mappedColumns.bjpName || 'BJP'} Cumulative`,
        data: trajectoryBjpData
      },
      {
        name: `${state.mappedColumns.incName || 'INC'} Cumulative`,
        data: trajectoryIncData
      }
    ],
    colors: ['#ff9933', '#138808'],
    xaxis: {
      categories: trajectoryCategories,
      title: { text: `Polling Stations Sequentially (1 to ${workingData.length})` }
    },
    yaxis: {
      title: { text: 'Cumulative Votes' },
      labels: {
        formatter: (value) => {
          return value.toLocaleString();
        }
      }
    },
    tooltip: {
      enabled: true,
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const b = workingData[dataPointIndex];
        if (!b) return '';
        
        // Calculate cumulative votes up to this index
        let cumBjp = 0;
        let cumInc = 0;
        let cumOthers = 0;
        let cumNota = 0;
        for (let i = 0; i <= dataPointIndex; i++) {
          cumBjp += workingData[i].bjpVotes;
          cumInc += workingData[i].incVotes;
          cumOthers += workingData[i].otherVotes;
          cumNota += workingData[i].notaVotes;
        }
        
        // Determine cumulative winner among BJP, INC
        const cumSorted = [
          { party: 'BJP', votes: cumBjp, color: '#ff9933', name: state.mappedColumns.bjpName || 'BJP' },
          { party: 'INC', votes: cumInc, color: '#138808', name: state.mappedColumns.incName || 'INC' }
        ].sort((a, b) => b.votes - a.votes);
        
        const cumLeader = cumSorted[0].party;
        const cumLeaderName = cumSorted[0].name;
        const cumMargin = cumSorted[0].votes - cumSorted[1].votes;
        const cumLeaderColor = cumSorted[0].color;
        
        const bjpColor = '#ff9933';
        const incColor = '#138808';
        const otherColor = '#06b6d4';
        const notaColor = '#64748b';
        
        // Booth votes relative to winner
        const winVotes = Math.max(b.bjpVotes, b.incVotes, b.otherVotes);
        const bjpMargin = b.bjpVotes - winVotes;
        const incMargin = b.incVotes - winVotes;
        const otherMargin = b.otherVotes - winVotes;
        
        return `
          <div style="background: #0f172a; border: 1px solid rgba(148, 163, 184, 0.15); padding: 12px; border-radius: 8px; font-family: 'Outfit', sans-serif; min-width: 280px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); backdrop-filter: blur(8px); color: #f8fafc; line-height: 1.4;">
            <div style="font-weight: 700; font-size: 0.8rem; color: #22d3ee; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 6px; margin-bottom: 8px; white-space: normal; word-break: break-word;">
              📍 Booth #${b.boothNumber}: ${b.boothName}
            </div>
            
            <div style="font-size: 0.7rem; color: #94a3b8; margin-bottom: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
              Booth Results & Margins:
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 3px;">
              <span style="color: ${bjpColor}">BJP: ${state.mappedColumns.bjpName || 'BJP'}</span>
              <span style="font-weight: 700">${b.bjpVotes.toLocaleString()} (${bjpMargin === 0 ? `🏆 Lead +${b.margin.toLocaleString()}` : `${bjpMargin.toLocaleString()}`})</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 3px;">
              <span style="color: ${incColor}">INC: ${state.mappedColumns.incName || 'INC'}</span>
              <span style="font-weight: 700">${b.incVotes.toLocaleString()} (${incMargin === 0 ? `🏆 Lead +${b.margin.toLocaleString()}` : `${incMargin.toLocaleString()}`})</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 3px;">
              <span style="color: ${otherColor}">Others</span>
              <span style="font-weight: 700">${b.otherVotes.toLocaleString()} (${otherMargin === 0 ? `🏆 Lead +${b.margin.toLocaleString()}` : `${otherMargin.toLocaleString()}`})</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 8px; border-bottom: 1px dashed rgba(255,255,255,0.08); padding-bottom: 6px;">
              <span style="color: ${notaColor}">NOTA</span>
              <span style="font-weight: 700">${b.notaVotes.toLocaleString()}</span>
            </div>
            
            <div style="font-size: 0.7rem; color: #94a3b8; margin-bottom: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
              Cumulative Progression:
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 3px;">
              <span style="color: ${bjpColor}">BJP Running Sum</span>
              <span style="font-weight: 700">${cumBjp.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 6px; border-bottom: 1px dashed rgba(255,255,255,0.08); padding-bottom: 4px;">
              <span style="color: ${incColor}">INC Running Sum</span>
              <span style="font-weight: 700">${cumInc.toLocaleString()}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; color: #f8fafc; margin-top: 2px;">
              <span>Cumulative Lead</span>
              <span style="color: ${cumLeaderColor}">
                ${cumLeader} +${cumMargin.toLocaleString()}
              </span>
            </div>
          </div>
        `;
      }
    }
  });
}

// --- Submit predefined suggestion chat query ---
function submitChatQuery(query) {
  document.getElementById("chat-input").value = query;
  handleUserChatMessage();
}

// --- Send User Chat Message and Dispatch Local Agent Thinking State ---
function handleUserChatMessage() {
  const inputEl = document.getElementById("chat-input");
  const query = inputEl.value.trim();
  
  if (!query) return;
  
  // Append User message
  addUserChatMessage(query);
  inputEl.value = "";
  
  // Thinking bubble state
  const messagesContainer = document.getElementById("chat-messages-container");
  const loadingBubble = document.createElement("div");
  loadingBubble.className = "message message-agent chat-loading";
  loadingBubble.id = "chat-thinking-bubble";
  loadingBubble.innerHTML = `
    <span class="dot-loading"></span>
    <span class="dot-loading"></span>
    <span class="dot-loading"></span>
  `;
  messagesContainer.appendChild(loadingBubble);
  scrollToBottom(messagesContainer);
  
  // Query processing delay to simulate smart reasoning
  setTimeout(() => {
    // Remove bubble
    const bubble = document.getElementById("chat-thinking-bubble");
    if (bubble) bubble.remove();
    
    // Execute Local Query NLP Solver
    const reply = parseAndSolveElectionQuery(query);
    addAgentChatMessage(reply);
  }, 750);
}

// --- Chat Bubble Appends ---
function addUserChatMessage(content) {
  const messagesContainer = document.getElementById("chat-messages-container");
  const div = document.createElement("div");
  div.className = "message message-user";
  div.textContent = content;
  messagesContainer.appendChild(div);
  scrollToBottom(messagesContainer);
}

function addAgentChatMessage(htmlContent) {
  const messagesContainer = document.getElementById("chat-messages-container");
  const div = document.createElement("div");
  div.className = "message message-agent";
  div.innerHTML = htmlContent;
  messagesContainer.appendChild(div);
  scrollToBottom(messagesContainer);
}

function scrollToBottom(container) {
  container.scrollTop = container.scrollHeight;
}

// --- Local NLP Intelligence Election Query Solver ---
function parseAndSolveElectionQuery(query) {
  const q = query.toLowerCase();
  const workingData = getWorkingDataset();
  
  if (workingData.length === 0) {
    return `<p>I'd love to help, but no election data is loaded. Please select a constituency on the left first!</p>`;
  }
  
  const bjpCand = state.mappedColumns.bjpName;
  const incCand = state.mappedColumns.incName;
  
  // Projection alert banner
  const swingSlider = document.getElementById("swing-slider");
  const turnoutSlider = document.getElementById("turnout-slider");
  const swing = swingSlider ? parseInt(swingSlider.value) : 0;
  const turnout = turnoutSlider ? parseInt(turnoutSlider.value) : 0;
  
  let simBadgeHtml = "";
  if (swing !== 0 || turnout !== 0) {
    simBadgeHtml = `
      <div style="background: rgba(34, 211, 238, 0.1); border: 1px solid rgba(34, 211, 238, 0.3); border-radius: 6px; padding: 6px 10px; font-size: 0.7rem; font-weight: 700; color: var(--accent-cyan); display: flex; align-items: center; gap: 6px; margin-bottom: 12px; line-height:1.3">
        <span style="display:inline-block; width:6px; height:6px; background:var(--accent-cyan); border-radius:50%; box-shadow:0 0 6px var(--accent-cyan);"></span>
        PROJECTION MODEL ACTIVE: Swing: ${swing > 0 ? '+' : ''}${swing}% (BJP ⇄ INC), Turnout Shift: ${turnout > 0 ? '+' : ''}${turnout}%
      </div>
    `;
  }
  
  let replyHtml = "";
  
  // 1. Ask about a specific booth number e.g. "Who won booth 23?"
  const boothNumMatch = q.match(/(?:booth|polling station|station|number|no\.?)\s*(\d+)/i);
  if (boothNumMatch && boothNumMatch[1]) {
    const bNumber = parseInt(boothNumMatch[1]);
    const booth = workingData.find(b => b.boothNumber === bNumber);
    
    if (booth) {
      const winnerParty = booth.winner;
      const margin = booth.margin;
      const winnerName = winnerParty === 'BJP' ? bjpCand : (winnerParty === 'INC' ? incCand : (state.mappedColumns.otherName || "Other Candidate"));
      const leadColorStyle = winnerParty === 'BJP' ? 'color: var(--color-bjp)' : (winnerParty === 'INC' ? 'color: var(--color-inc)' : 'color: var(--accent-cyan)');
      
      // Calculate margins relative to the winner
      const winVotes = Math.max(booth.bjpVotes, booth.incVotes, booth.otherVotes);
      const bjpMargin = booth.bjpVotes - winVotes;
      const incMargin = booth.incVotes - winVotes;
      const otherMargin = booth.otherVotes - winVotes;
      
      const bjpMarginStr = bjpMargin === 0 ? `🏆 Lead +${booth.margin.toLocaleString()}` : `${bjpMargin.toLocaleString()}`;
      const incMarginStr = incMargin === 0 ? `🏆 Lead +${booth.margin.toLocaleString()}` : `${incMargin.toLocaleString()}`;
      const otherMarginStr = otherMargin === 0 ? `🏆 Lead +${booth.margin.toLocaleString()}` : `${otherMargin.toLocaleString()}`;
      
      // Play confetti on request
      if (winnerParty === 'BJP' || winnerParty === 'INC' || winnerParty === 'OTHER') triggerVictoryConfetti();
      
      replyHtml = `
        <p>🔍 <strong>Polling Station #${booth.boothNumber} Summary:</strong></p>
        <p><strong>Name:</strong> ${booth.boothName}</p>
        <div class="chat-party-metric bjp" style="display:flex; justify-content:space-between; margin-bottom: 4px; padding: 4px 8px; background: rgba(255, 153, 51, 0.08); border-radius: 6px;">
          <span style="color: var(--color-bjp); font-weight:600;">BJP (${bjpCand})</span>
          <span style="font-weight: 700;">${booth.bjpVotes.toLocaleString()} (${bjpMarginStr})</span>
        </div>
        <div class="chat-party-metric inc" style="display:flex; justify-content:space-between; margin-bottom: 4px; padding: 4px 8px; background: rgba(19, 136, 8, 0.08); border-radius: 6px;">
          <span style="color: var(--color-inc); font-weight:600;">INC (${incCand})</span>
          <span style="font-weight: 700;">${booth.incVotes.toLocaleString()} (${incMarginStr})</span>
        </div>
        <div class="chat-party-metric other" style="display:flex; justify-content:space-between; margin-bottom: 4px; padding: 4px 8px; background: rgba(6, 182, 212, 0.08); border-radius: 6px;">
          <span style="color: var(--accent-cyan); font-weight:600;">Others (${state.mappedColumns.otherName || "Others"})</span>
          <span style="font-weight: 700;">${booth.otherVotes.toLocaleString()} (${otherMarginStr})</span>
        </div>
        <div class="chat-party-metric nota" style="display:flex; justify-content:space-between; margin-bottom: 8px; padding: 4px 8px; background: rgba(148, 163, 184, 0.08); border-radius: 6px;">
          <span style="color: var(--text-muted)">NOTA</span>
          <span style="font-weight: 700;">${booth.notaVotes.toLocaleString()}</span>
        </div>
        <p style="margin-top:10px">🏆 Winner: <strong style="${leadColorStyle}">${winnerParty} (${winnerName})</strong> by a victory margin of <span class="stat-value" style="color: var(--accent-cyan); font-weight:700;">${margin.toLocaleString()} votes</span>.</p>
      `;
    } else {
      replyHtml = `<p>I couldn't find polling station number <strong>${bNumber}</strong>. Our loaded constituency dataset contains booths numbering from <strong>1 to ${workingData.length}</strong>.</p>`;
    }
  }
  
  // 2. Ask about the Highest Margin booth e.g. "Which booth had highest victory margin?"
  else if (q.includes("highest margin") || q.includes("biggest win") || q.includes("maximum margin") || q.includes("max margin") || q.includes("biggest victory")) {
    const maxBooth = [...workingData].sort((a, b) => b.margin - a.margin)[0];
    const winnerName = maxBooth.winner === 'BJP' ? bjpCand : (maxBooth.winner === 'INC' ? incCand : (state.mappedColumns.otherName || "Other"));
    const leadColorStyle = maxBooth.winner === 'BJP' ? 'color: var(--color-bjp)' : (maxBooth.winner === 'INC' ? 'color: var(--color-inc)' : 'color: var(--accent-cyan)');
    
    const winVotes = Math.max(maxBooth.bjpVotes, maxBooth.incVotes, maxBooth.otherVotes);
    const bjpMargin = maxBooth.bjpVotes - winVotes;
    const incMargin = maxBooth.incVotes - winVotes;
    const otherMargin = maxBooth.otherVotes - winVotes;
    
    const bjpMarginStr = bjpMargin === 0 ? `🏆 Lead +${maxBooth.margin.toLocaleString()}` : `${bjpMargin.toLocaleString()}`;
    const incMarginStr = incMargin === 0 ? `🏆 Lead +${maxBooth.margin.toLocaleString()}` : `${incMargin.toLocaleString()}`;
    const otherMarginStr = otherMargin === 0 ? `🏆 Lead +${maxBooth.margin.toLocaleString()}` : `${otherMargin.toLocaleString()}`;
    
    triggerVictoryConfetti();
    replyHtml = `
      <p>🏆 <strong>Highest Victory Margin Polling Station:</strong></p>
      <p>The highest margin of victory was recorded at <strong>Booth #${maxBooth.boothNumber}</strong>:</p>
      <p>📍 <strong>${maxBooth.boothName}</strong></p>
      <div class="chat-party-metric bjp" style="display:flex; justify-content:space-between; margin-bottom: 4px; padding: 4px 8px; background: rgba(255, 153, 51, 0.08); border-radius: 6px;">
        <span style="color: var(--color-bjp); font-weight:600;">BJP (${bjpCand})</span>
        <span style="font-weight: 700;">${maxBooth.bjpVotes.toLocaleString()} (${bjpMarginStr})</span>
      </div>
      <div class="chat-party-metric inc" style="display:flex; justify-content:space-between; margin-bottom: 4px; padding: 4px 8px; background: rgba(19, 136, 8, 0.08); border-radius: 6px;">
        <span style="color: var(--color-inc); font-weight:600;">INC (${incCand})</span>
        <span style="font-weight: 700;">${maxBooth.incVotes.toLocaleString()} (${incMarginStr})</span>
      </div>
      <div class="chat-party-metric other" style="display:flex; justify-content:space-between; margin-bottom: 4px; padding: 4px 8px; background: rgba(6, 182, 212, 0.08); border-radius: 6px;">
        <span style="color: var(--accent-cyan); font-weight:600;">Others (${state.mappedColumns.otherName || "Others"})</span>
        <span style="font-weight: 700;">${maxBooth.otherVotes.toLocaleString()} (${otherMarginStr})</span>
      </div>
      <div class="chat-party-metric nota" style="display:flex; justify-content:space-between; margin-bottom: 8px; padding: 4px 8px; background: rgba(148, 163, 184, 0.08); border-radius: 6px;">
        <span style="color: var(--text-muted)">NOTA</span>
        <span style="font-weight: 700;">${maxBooth.notaVotes.toLocaleString()}</span>
      </div>
      <p style="margin-top:10px">🏆 Winner: <strong style="${leadColorStyle}">${maxBooth.winner} (${winnerName})</strong> by a substantial margin of <span class="stat-value" style="color: var(--accent-cyan); font-weight:700;">${maxBooth.margin.toLocaleString()} votes</span> out of ${maxBooth.totalVotes.toLocaleString()} valid votes polled!</p>
    `;
  }
  
  // 3. Ask about Lowest Turnout booth
  else if (q.includes("lowest turnout") || q.includes("least votes") || q.includes("lowest votes") || q.includes("minimum votes")) {
    const minBooth = [...workingData].sort((a, b) => a.totalVotes - b.totalVotes)[0];
    
    const winVotes = Math.max(minBooth.bjpVotes, minBooth.incVotes, minBooth.otherVotes);
    const bjpMargin = minBooth.bjpVotes - winVotes;
    const incMargin = minBooth.incVotes - winVotes;
    const otherMargin = minBooth.otherVotes - winVotes;
    
    const bjpMarginStr = bjpMargin === 0 ? `🏆 Lead +${minBooth.margin.toLocaleString()}` : `${bjpMargin.toLocaleString()}`;
    const incMarginStr = incMargin === 0 ? `🏆 Lead +${minBooth.margin.toLocaleString()}` : `${incMargin.toLocaleString()}`;
    const otherMarginStr = otherMargin === 0 ? `🏆 Lead +${minBooth.margin.toLocaleString()}` : `${otherMargin.toLocaleString()}`;
    
    replyHtml = `
      <p>📉 <strong>Lowest Votes Polled Polling Station:</strong></p>
      <p>The lowest voter turnout / votes polled was recorded at <strong>Booth #${minBooth.boothNumber}</strong>:</p>
      <p>📍 <strong>${minBooth.boothName}</strong></p>
      <p>🗳️ <strong>Total Votes Polled:</strong> <span class="stat-value">${minBooth.totalVotes.toLocaleString()} votes</span></p>
      <div class="chat-party-metric bjp" style="display:flex; justify-content:space-between; margin-bottom: 4px; padding: 4px 8px; background: rgba(255, 153, 51, 0.08); border-radius: 6px;">
        <span style="color: var(--color-bjp); font-weight:600;">BJP (${bjpCand})</span>
        <span style="font-weight: 700;">${minBooth.bjpVotes.toLocaleString()} (${bjpMarginStr})</span>
      </div>
      <div class="chat-party-metric inc" style="display:flex; justify-content:space-between; margin-bottom: 4px; padding: 4px 8px; background: rgba(19, 136, 8, 0.08); border-radius: 6px;">
        <span style="color: var(--color-inc); font-weight:600;">INC (${incCand})</span>
        <span style="font-weight: 700;">${minBooth.incVotes.toLocaleString()} (${incMarginStr})</span>
      </div>
      <div class="chat-party-metric other" style="display:flex; justify-content:space-between; margin-bottom: 4px; padding: 4px 8px; background: rgba(6, 182, 212, 0.08); border-radius: 6px;">
        <span style="color: var(--accent-cyan); font-weight:600;">Others (${state.mappedColumns.otherName || "Others"})</span>
        <span style="font-weight: 700;">${minBooth.otherVotes.toLocaleString()} (${otherMarginStr})</span>
      </div>
      <div class="chat-party-metric nota" style="display:flex; justify-content:space-between; margin-bottom: 8px; padding: 4px 8px; background: rgba(148, 163, 184, 0.08); border-radius: 6px;">
        <span style="color: var(--text-muted)">NOTA</span>
        <span style="font-weight: 700;">${minBooth.notaVotes.toLocaleString()}</span>
      </div>
    `;
  }
  
  // 4. Summarize BJP vs INC overall wins
  else if (q.includes("bjp vs inc") || q.includes("wins") || q.includes("win summary") || q.includes("who won") || q.includes("leading party")) {
    let bjpWins = 0;
    let incWins = 0;
    let otherWins = 0;
    let totalBjpVotes = 0;
    let totalIncVotes = 0;
    
    workingData.forEach(b => {
      totalBjpVotes += b.bjpVotes;
      totalIncVotes += b.incVotes;
      if (b.winner === 'BJP') bjpWins++;
      else if (b.winner === 'INC') incWins++;
      else otherWins++;
    });
    
    const overallWinner = totalBjpVotes > totalIncVotes ? 'BJP' : 'INC';
    const overallMargin = Math.abs(totalBjpVotes - totalIncVotes);
    const overallWinnerName = overallWinner === 'BJP' ? bjpCand : incCand;
    const overallWinnerStyle = overallWinner === 'BJP' ? 'color: var(--color-bjp)' : 'color: var(--color-inc)';
    
    replyHtml = `
      <p>📊 <strong>BJP vs INC Constituency Summary:</strong></p>
      <p>Here is the breakdown of polling booths won by each party in <strong>${state.activeConstituency}</strong>:</p>
      <div class="chat-party-metric bjp">
        <span>BJP (Booths Won)</span>
        <span>${bjpWins} booths (${((bjpWins/workingData.length)*100).toFixed(1)}%)</span>
      </div>
      <div class="chat-party-metric inc">
        <span>INC (Booths Won)</span>
        <span>${incWins} booths (${((incWins/workingData.length)*100).toFixed(1)}%)</span>
      </div>
      <p style="margin-top:10px">🗳️ <strong>Total Constituency Vote Counts:</strong></p>
      <p>BJP (${bjpCand}): <strong>${totalBjpVotes.toLocaleString()}</strong></p>
      <p>INC (${incCand}): <strong>${totalIncVotes.toLocaleString()}</strong></p>
      <p>🏆 Overall Constituency Winner: <strong style="${overallWinnerStyle}">${overallWinner} (${overallWinnerName})</strong> by a victory margin of <span class="stat-value">${overallMargin.toLocaleString()} votes</span>.</p>
    `;
  }
  
  // 5. Ask about Top 5 BJP strong booths
  else if (q.includes("top 5 bjp") || q.includes("bjp strong") || q.includes("bjp lead")) {
    const topBjp = [...workingData].sort((a, b) => b.bjpVotes - a.bjpVotes).slice(0, 5);
    let listHtml = `<p>🧡 <strong>Top 5 Strongest Polling Booths for BJP (${bjpCand}):</strong></p><ol style="margin-top:6px; padding-left:20px">`;
    topBjp.forEach(b => {
      listHtml += `
        <li style="margin-bottom:8px">
          <strong>Booth #${b.boothNumber}</strong>: ${b.boothName}<br/>
          Votes: <span style="color:var(--color-bjp); font-weight:700">${b.bjpVotes.toLocaleString()}</span> (Margin: +${b.margin.toLocaleString()})
        </li>`;
    });
    listHtml += `</ol>`;
    replyHtml = listHtml;
  }
  
  // 6. Ask about Top 5 INC strong booths
  else if (q.includes("top 5 inc") || q.includes("inc strong") || q.includes("inc lead") || q.includes("congress strong")) {
    const topInc = [...workingData].sort((a, b) => b.incVotes - a.incVotes).slice(0, 5);
    let listHtml = `<p>💚 <strong>Top 5 Strongest Polling Booths for INC (${incCand}):</strong></p><ol style="margin-top:6px; padding-left:20px">`;
    topInc.forEach(b => {
      listHtml += `
        <li style="margin-bottom:8px">
          <strong>Booth #${b.boothNumber}</strong>: ${b.boothName}<br/>
          Votes: <span style="color:var(--color-inc); font-weight:700">${b.incVotes.toLocaleString()}</span> (Margin: +${b.margin.toLocaleString()})
        </li>`;
    });
    listHtml += `</ol>`;
    replyHtml = listHtml;
  }
  
  // 7. General Constituency overview
  else if (q.includes("overview") || q.includes("constituency") || q.includes("summary") || q.includes("total")) {
    let totalVotes = 0;
    let bjpVotes = 0;
    let incVotes = 0;
    let notaVotes = 0;
    
    workingData.forEach(b => {
      totalVotes += b.totalVotes;
      bjpVotes += b.bjpVotes;
      incVotes += b.incVotes;
      notaVotes += b.notaVotes;
    });
    
    replyHtml = `
      <p>🗳️ <strong>Constituency Analysis Overview:</strong></p>
      <p><strong>Name:</strong> ${state.activeConstituency}</p>
      <p><strong>Total Valid Votes:</strong> ${totalVotes.toLocaleString()} across ${workingData.length} booths.</p>
      <div class="chat-party-metric bjp">
        <span>BJP (${bjpCand}) Share</span>
        <span>${bjpVotes.toLocaleString()} (${((bjpVotes/totalVotes)*100).toFixed(2)}%)</span>
      </div>
      <div class="chat-party-metric inc">
        <span>INC (${incCand}) Share</span>
        <span>${incVotes.toLocaleString()} (${((incVotes/totalVotes)*100).toFixed(2)}%)</span>
      </div>
      <div class="chat-party-metric other">
        <span>NOTA Share</span>
        <span>${notaVotes.toLocaleString()} (${((notaVotes/totalVotes)*100).toFixed(2)}%)</span>
      </div>
    `;
  }
  
  // Fallback intelligent query helper
  else {
    replyHtml = `
      <p>I processed your query, but couldn't execute a specific mathematical data solve. You can ask me exact data actions, such as:</p>
      <ul>
        <li><em>"Who won booth 45?"</em></li>
        <li><em>"Which booth has BJP's highest margin?"</em></li>
        <li><em>"Show me BJP vs INC overall wins summary"</em></li>
        <li><em>"List the top 5 booths where INC leads"</em></li>
      </ul>
    `;
  }
  
  return simBadgeHtml + replyHtml;
}


// --- Confetti Celebrations ---
function triggerVictoryConfetti() {
  const duration = 2 * 1000;
  const end = Date.now() + duration;

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#ff9933', '#138808', '#ffffff']
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#ff9933', '#138808', '#ffffff']
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }());
}

// --- Display Toast Notifications ---
function showToast(message, type = "success") {
  console.log(`[Toast ${type.toUpperCase()}] ${message}`);
  
  // Inject a neat absolute toast in the DOM
  const existingToast = document.getElementById("ui-toast");
  if (existingToast) existingToast.remove();
  
  const toast = document.createElement("div");
  toast.id = "ui-toast";
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 24px;
    background: ${type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    font-size: 0.85rem;
    font-weight: 600;
    z-index: 10000;
    backdrop-filter: blur(8px);
    transition: all 0.3s ease;
    animation: slideInUp 0.3s ease;
  `;
  toast.innerHTML = `<span style="display:flex; align-items:center; gap:8px"><i data-lucide="${type === 'error' ? 'alert-triangle' : 'check'}"></i> ${message}</span>`;
  
  document.body.appendChild(toast);
  lucide.createIcons();
  
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- Reset Dashboard to Empty State ---
function resetDashboard() {
  state.allBoothData = [];
  state.filteredBoothData = [];
  state.currentPage = 1;
  state.activeConstituency = "";
  state.activeFilePath = "";
  
  document.getElementById("district-selector").value = "all";
  state.activeDivision = "all";
  populateConstituencies();
  updateMapHighlight();
  updateConstituencyTitle();
  
  document.getElementById("file-meta-container").style.display = "none";
  document.getElementById("file-input").value = "";
  document.getElementById("loaded-filename").textContent = "";
  
  document.getElementById("metric-total-voters").textContent = "0";
  document.getElementById("metric-turnout").textContent = "0.00%";
  document.getElementById("metric-winner").textContent = "-";
  
  document.getElementById("chat-input").setAttribute("disabled", "true");
  document.getElementById("chat-send-btn").setAttribute("disabled", "true");
  document.getElementById("chat-suggestions-box").style.display = "none";
  
  // Reset simulator
  document.getElementById("simulator-container").style.display = "none";
  const swingSlider = document.getElementById("swing-slider");
  const turnoutSlider = document.getElementById("turnout-slider");
  if (swingSlider) swingSlider.value = "0";
  if (turnoutSlider) turnoutSlider.value = "0";
  
  const swingValEl = document.getElementById("swing-val");
  const turnoutValEl = document.getElementById("turnout-val");
  const simStatus = document.getElementById("sim-status");
  if (swingValEl) {
    swingValEl.textContent = "0%";
    swingValEl.style.color = "var(--accent-indigo)";
  }
  if (turnoutValEl) {
    turnoutValEl.textContent = "0%";
    turnoutValEl.style.color = "var(--accent-cyan)";
  }
  if (simStatus) {
    simStatus.textContent = "🔍 REAL-TIME MODEL PROJECTED";
    simStatus.style.background = "rgba(99, 102, 241, 0.1)";
    simStatus.style.borderColor = "rgba(99, 102, 241, 0.2)";
    simStatus.style.color = "var(--accent-indigo)";
  }
  
  // Show overlays on reset
  const voteShareOverlay = document.getElementById("vote-share-overlay");
  const trajectoryOverlay = document.getElementById("trajectory-overlay");
  if (voteShareOverlay) voteShareOverlay.classList.remove("hidden");
  if (trajectoryOverlay) trajectoryOverlay.classList.remove("hidden");
  
  renderEmptyCharts();
  filterAndRenderTable();
  renderWaffleGrid();
  
  // Reset chat messages log
  const chatBody = document.getElementById("chat-messages-container");
  chatBody.innerHTML = `
    <div class="message message-agent">
      <p>Namaste! I am your <strong>Madhya Pradesh Election Commission AI Agent</strong>. 🗳️</p>
      <p>I can perform deep analytics on the Form 20 dataset for you in real-time.</p>
      <p>To start, select an administrative division or constituency on the left and drag & drop your <strong>Form 20 Excel or CSV sheet</strong>.</p>
    </div>
  `;
  
  showToast("Dashboard reset successfully!");
}

// ========================================================
//   REAL-TIME SWING & TURNOUT MATHEMATICAL ENGINE
// ========================================================

function getWorkingDataset() {
  const swingSlider = document.getElementById("swing-slider");
  const turnoutSlider = document.getElementById("turnout-slider");
  
  const swingVal = swingSlider ? parseInt(swingSlider.value) || 0 : 0;
  const turnoutVal = turnoutSlider ? parseInt(turnoutSlider.value) || 0 : 0;
  
  if (swingVal === 0 && turnoutVal === 0) {
    return state.allBoothData;
  }
  
  const turnoutMult = 1 + (turnoutVal / 100);
  
  return state.allBoothData.map(b => {
    // 1. Scale turnout
    const bjp0 = Math.round(b.bjpVotes * turnoutMult);
    const inc0 = Math.round(b.incVotes * turnoutMult);
    const other0 = Math.round(b.otherVotes * turnoutMult);
    const nota0 = Math.round(b.notaVotes * turnoutMult);
    const total0 = bjp0 + inc0 + other0 + nota0;
    
    // 2. Apply Swing (percentage of simulated total votes)
    const swingVotesCount = Math.round(total0 * (Math.abs(swingVal) / 100));
    
    let bjpSim = bjp0;
    let incSim = inc0;
    
    if (swingVal > 0) {
      // Shift from INC to BJP
      const delta = Math.min(swingVotesCount, inc0);
      bjpSim = bjp0 + delta;
      incSim = inc0 - delta;
    } else if (swingVal < 0) {
      // Shift from BJP to INC
      const delta = Math.min(swingVotesCount, bjp0);
      bjpSim = bjp0 - delta;
      incSim = inc0 + delta;
    }
    
    const totalSim = bjpSim + incSim + other0 + nota0;
    
    // Recalculate winner and margin
    let winnerSim = 'OTHER';
    let marginSim = 0;
    if (bjpSim > incSim && bjpSim > other0) {
      winnerSim = 'BJP';
      marginSim = bjpSim - Math.max(incSim, other0);
    } else if (incSim > bjpSim && incSim > other0) {
      winnerSim = 'INC';
      marginSim = incSim - Math.max(bjpSim, other0);
    } else {
      winnerSim = 'OTHER';
      marginSim = other0 - Math.max(bjpSim, incSim);
    }
    
    return {
      ...b,
      bjpVotes: bjpSim,
      incVotes: incSim,
      otherVotes: other0,
      notaVotes: nota0,
      totalVotes: totalSim,
      winner: winnerSim,
      margin: marginSim
    };
  });
}

function handleSimulatorChange() {
  const swingSlider = document.getElementById("swing-slider");
  const turnoutSlider = document.getElementById("turnout-slider");
  const swingValEl = document.getElementById("swing-val");
  const turnoutValEl = document.getElementById("turnout-val");
  const simStatus = document.getElementById("sim-status");
  
  if (!swingSlider || !turnoutSlider) return;
  
  const swing = parseInt(swingSlider.value) || 0;
  const turnout = parseInt(turnoutSlider.value) || 0;
  
  // Update labels
  if (swing > 0) {
    swingValEl.textContent = `+${swing}% BJP`;
    swingValEl.style.color = "var(--color-bjp)";
  } else if (swing < 0) {
    swingValEl.textContent = `+${Math.abs(swing)}% INC`;
    swingValEl.style.color = "var(--color-inc)";
  } else {
    swingValEl.textContent = "0%";
    swingValEl.style.color = "var(--accent-indigo)";
  }
  
  if (turnout > 0) {
    turnoutValEl.textContent = `+${turnout}%`;
    turnoutValEl.style.color = "var(--accent-cyan)";
  } else if (turnout < 0) {
    turnoutValEl.textContent = `${turnout}%`;
    turnoutValEl.style.color = "var(--accent-red)";
  } else {
    turnoutValEl.textContent = "0%";
    turnoutValEl.style.color = "var(--accent-cyan)";
  }
  
  // Update banner styling
  if (swing !== 0 || turnout !== 0) {
    simStatus.textContent = "⚡ PROJECTION MODEL ACTIVE";
    simStatus.style.background = "rgba(34, 211, 238, 0.15)";
    simStatus.style.borderColor = "rgba(34, 211, 238, 0.35)";
    simStatus.style.color = "var(--accent-cyan)";
  } else {
    simStatus.textContent = "🔍 REAL-TIME MODEL PROJECTED";
    simStatus.style.background = "rgba(99, 102, 241, 0.1)";
    simStatus.style.borderColor = "rgba(99, 102, 241, 0.2)";
    simStatus.style.color = "var(--accent-indigo)";
  }
  
  // Re-run updates
  updateDashboardMetrics();
  filterAndRenderTable();
  renderAnalyticalCharts();
  renderWaffleGrid();
}

// ========================================================
//   DYNAMIC BOOTH WIN MAP (WAFFLE GRID) RENDERING
// ========================================================

function renderWaffleGrid() {
  const grid = document.getElementById("booth-waffle-grid");
  const hoverInfo = document.getElementById("booth-waffle-hover-info");
  
  if (!grid) return;
  
  grid.innerHTML = "";
  
  const workingData = getWorkingDataset();
  
  if (workingData.length === 0) {
    grid.innerHTML = `
      <div class="grid-empty-state" style="grid-column:1/-1; text-align:center; padding:40px 10px; color:var(--text-muted); font-size:0.8rem;">
        <i data-lucide="layout-grid" style="width:32px; height:32px; margin: 0 auto 10px; color:var(--text-muted); opacity:0.5;"></i>
        <p>Load constituency Form 20 data to map individual polling booth wins</p>
      </div>
    `;
    if (hoverInfo) {
      hoverInfo.textContent = "Hover over a booth block to see win margin details";
    }
    lucide.createIcons();
    return;
  }
  
  // Render waffle blocks
  workingData.forEach(b => {
    const block = document.createElement("div");
    block.className = `waffle-block ${b.winner.toLowerCase()}`;
    
    // Add tooltip text
    const bjpCand = state.mappedColumns.bjpName || "BJP";
    const incCand = state.mappedColumns.incName || "INC";
    const otherCand = state.mappedColumns.otherName || "Others";
    
    // Standard margin calculations
    const winVotes = Math.max(b.bjpVotes, b.incVotes, b.otherVotes);
    const bjpMargin = b.bjpVotes - winVotes;
    const incMargin = b.incVotes - winVotes;
    const otherMargin = b.otherVotes - winVotes;
    
    const bjpMarginStr = bjpMargin === 0 ? `🏆 Lead +${b.margin.toLocaleString()}` : `${bjpMargin.toLocaleString()}`;
    const incMarginStr = incMargin === 0 ? `🏆 Lead +${b.margin.toLocaleString()}` : `${incMargin.toLocaleString()}`;
    const otherMarginStr = otherMargin === 0 ? `🏆 Lead +${b.margin.toLocaleString()}` : `${otherMargin.toLocaleString()}`;
    
    block.addEventListener("mouseenter", () => {
      if (hoverInfo) {
        hoverInfo.innerHTML = `
          <span style="color: var(--text-main); font-weight:700;">#${b.boothNumber}</span>: ${b.boothName} | 
          <span style="color: var(--color-bjp); font-weight:600;">BJP: ${b.bjpVotes.toLocaleString()} (${bjpMarginStr})</span> | 
          <span style="color: var(--color-inc); font-weight:600;">INC: ${b.incVotes.toLocaleString()} (${incMarginStr})</span> | 
          <span style="color: var(--accent-cyan); font-weight:600;">Others: ${b.otherVotes.toLocaleString()} (${otherMarginStr})</span> | 
          <span style="color: var(--text-muted)">NOTA: ${b.notaVotes.toLocaleString()}</span>
        `;
      }
    });
    
    block.addEventListener("mouseleave", () => {
      if (hoverInfo) {
        hoverInfo.textContent = "Hover over a booth block to see win margin details";
      }
    });
    
    block.addEventListener("click", () => {
      submitChatQuery(`Who won booth number ${b.boothNumber}`);
      showToast(`Selected Booth #${b.boothNumber}`);
    });
    
    grid.appendChild(block);
  });
}
