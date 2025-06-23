document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const body = document.body;
    const sectionsGrid = document.getElementById('sections-grid');
    const p1NameInput = document.getElementById('provider1-name');
    const p2NameInput = document.getElementById('provider2-name');
    const summaryTitle = document.getElementById('summary-title');
    const p1TotalSpan = document.getElementById('provider1-total');
    const p2TotalSpan = document.getElementById('provider2-total');
    const monthlyDiffSpan = document.getElementById('monthly-difference');
    const yearlyDiffSpan = document.getElementById('yearly-difference');
    const threeYearDiffSpan = document.getElementById('3year-difference');
    const comparisonModeBtn = document.getElementById('comparisonModeBtn');
    const clearPinnedBtn = document.getElementById('clearPinnedBtn');
    const saveDataBtn = document.getElementById('saveData');
    const loadDataBtn = document.getElementById('loadData');
    const clearDataBtn = document.getElementById('clearData');
    const addSectionBtns = document.querySelectorAll('.add-section-btn');
    const summaryBox = document.querySelector('.summary-section-box');
    const summaryNotes = document.getElementById('summaryNotes');

    // --- State & Config ---
    let isComparisonModeActive = false;
    let pairCounter = 0;

    const ICONS = {
        delete: `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>`,
        mirror: `<svg viewBox="0 0 24 24"><path d="M8 7v-2h2v2h-2zm-2 2h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm-2-6h2v2h-2v-2zm16-4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h-12c-1.1 0-2-.9-2-2v-2h2v2h10v-10h-10v2h-2v-2c0-1.1.9-2 2-2h12zm-8 2h2v2h-2v-2zm-4 0h2v2h-2v-2zm8 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2z"></path></svg>`
    };

    const getSectionCost = (sectionEl) => {
        if (!sectionEl) return 0;
        let total = 0;
        sectionEl.querySelectorAll('.custom-item-box').forEach(item => {
            if (item.querySelector('.cost-checkbox').checked) {
                total += parseFloat(item.querySelector('.value-input').value) || 0;
            }
        });
        return total;
    };
    
    const createSection = (providerIndex, title, pairId, row, notes = '') => {
        const sectionEl = document.createElement('div');
        sectionEl.className = 'section-box';
        sectionEl.dataset.pairId = pairId;
        sectionEl.dataset.provider = providerIndex;
        sectionEl.style.gridColumn = providerIndex;
        sectionEl.style.gridRow = row;
        sectionEl.innerHTML = `
            <div class="section-box-header">
                <input type="text" class="section-title-input" value="${title}">
                <button class="delete-section-btn" title="Delete Category">${ICONS.delete}</button>
            </div>
            <div class="section-content">
                <div class="dynamic-items-container"></div>
                <button class="add-custom-item-btn">+ Add Item</button>
            </div>
            <div class="section-footer">
                <div class="savings-panel">
                    <button class="calculate-savings-btn" title="Compare Category">CC</button>
                    <span class="savings-display"></span>
                </div>
                <div class="comparison-display-panel"></div>
            </div>
            <div class="notes-section"><textarea placeholder="Notes...">${notes}</textarea></div>
        `;
        sectionEl.querySelector('.delete-section-btn').addEventListener('click', () => { 
            if (confirm('Are you sure you want to delete this category?')) { 
                sectionEl.remove();
                updateDisplays(); 
            } 
        });
        sectionEl.querySelector('.add-custom-item-btn').addEventListener('click', (e) => addCustomItem(e.target.previousElementSibling));
        sectionEl.querySelector('.calculate-savings-btn').addEventListener('click', handleSimpleCompare);
        sectionEl.addEventListener('click', handleSectionClick);
        sectionsGrid.appendChild(sectionEl);
        return sectionEl;
    };

    const addCustomItem = (container, itemData = { label: '', value: '', isCost: true }) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'custom-item-box';
        const label = itemData.label.replace(/"/g, '"');
        const value = itemData.value.replace(/"/g, '"');
        itemEl.innerHTML = `
            <button class="mirror-item-btn" title="Copy label to other side">${ICONS.mirror}</button>
            <input type="text" class="label-input" placeholder="Label" value="${label}">
            <input type="text" class="value-input" placeholder="Value ($)" value="${value}">
            <input type="checkbox" class="cost-checkbox" title="Include in total" ${itemData.isCost ? 'checked' : ''}>
        `;
        itemEl.querySelector('.mirror-item-btn').addEventListener('click', (e) => {
            const sourceSection = e.target.closest('.section-box');
            const currentLabel = e.target.closest('.custom-item-box').querySelector('.label-input').value;
            if (!currentLabel) { alert('Please enter a label before mirroring.'); return; }
            const targetSection = document.querySelector(`.section-box[data-pair-id="${sourceSection.dataset.pairId}"][data-provider="${sourceSection.dataset.provider === '1' ? '2' : '1'}"]`);
            if (targetSection) addCustomItem(targetSection.querySelector('.dynamic-items-container'), { label: currentLabel, value: '', isCost: true });
            else alert('No matching category on the other side.');
        });
        container.appendChild(itemEl);
        updateDisplays();
    };

    const updateDisplays = () => {
        let p1Total = 0, p2Total = 0;
        if (isComparisonModeActive) {
            document.querySelectorAll('.section-box.is-selected').forEach(box => {
                const cost = getSectionCost(box);
                if (box.dataset.provider === '1') p1Total += cost;
                else p2Total += cost;
            });
            updateComparisonPanels(p1Total, p2Total);
            summaryTitle.textContent = "Custom Comparison Summary";
        } else {
            document.querySelectorAll('.section-box').forEach(box => {
                const cost = getSectionCost(box);
                if (box.dataset.provider === '1') p1Total += cost;
                else p2Total += cost;
            });
            summaryTitle.textContent = "Summary & Grand Totals";
        }

        const monthlySavings = p1Total - p2Total;
        p1TotalSpan.textContent = `$${p1Total.toFixed(2)}`;
        p2TotalSpan.textContent = `$${p2Total.toFixed(2)}`;
        
        const formatSavings = (amount) => {
            const sign = amount >= 0 ? '+' : '';
            return `${sign}$${amount.toFixed(2)}`;
        };

        monthlyDiffSpan.textContent = formatSavings(monthlySavings);
        monthlyDiffSpan.className = `summary-total highlight colspan-2 ${monthlySavings >= 0 ? 'savings' : 'loss'}`;

        yearlyDiffSpan.textContent = formatSavings(monthlySavings * 12);
        yearlyDiffSpan.className = `summary-total colspan-2 ${monthlySavings >= 0 ? 'savings' : 'loss'}`;

        threeYearDiffSpan.textContent = formatSavings(monthlySavings * 36);
        threeYearDiffSpan.className = `summary-total colspan-2 ${monthlySavings >= 0 ? 'savings' : 'loss'}`;

        summaryBox.classList.toggle('has-savings', monthlySavings > 0);
    };
    
    const updateComparisonPanels = (p1GroupTotal, p2GroupTotal) => {
        const p2Name = p2NameInput.value || 'Provider 2';
        const savings = p1GroupTotal - p2GroupTotal;
        let resultHTML = '';

        if (savings > 0) {
            resultHTML = `<div class="result savings-positive">${p2Name} is $${savings.toFixed(2)} cheaper</div>`;
        } else if (savings < 0) {
            resultHTML = `<div class="result savings-negative">${p2Name} is $${Math.abs(savings).toFixed(2)} more expensive</div>`;
        } else {
            resultHTML = `<div class="result">Costs are equal</div>`;
        }
        
        document.querySelectorAll('.section-box.is-selected, .section-box.is-pinned').forEach(box => {
            const panel = box.querySelector('.comparison-display-panel');
            panel.innerHTML = `${resultHTML} <button class="clear-result-btn" title="Clear this result">×</button>`;
        });
    };

    const handleSectionClick = (e) => {
        if (!isComparisonModeActive || e.target.closest('button, input, textarea')) return;
        e.currentTarget.classList.toggle('is-selected');
        updateDisplays();
    };

    const handleSimpleCompare = (e) => {
        e.stopPropagation();
        if (isComparisonModeActive) { alert("Exit Custom Comparison mode to use this feature."); return; }
        const sourceSection = e.target.closest('.section-box');
        const targetSection = document.querySelector(`.section-box[data-pair-id="${sourceSection.dataset.pairId}"][data-provider="${sourceSection.dataset.provider === '1' ? '2' : '1'}"]`);
        const cost1 = getSectionCost(sourceSection);
        const cost2 = getSectionCost(targetSection);
        const diff = cost1 - cost2;
        const display = sourceSection.querySelector('.savings-display');
        
        display.classList.remove('savings-positive', 'savings-negative');
        let text = '';
        if (diff > 0) { text = `$${diff.toFixed(2)} more expensive`; display.classList.add('savings-negative'); }
        else if (diff < 0) { text = `$${Math.abs(diff).toFixed(2)} cheaper`; display.classList.add('savings-positive'); }
        else { text = 'Equal cost'; }
        
        display.innerHTML = `<span>${text}</span> <button class="clear-result-btn" title="Clear this result">×</button>`;
    };
    
    comparisonModeBtn.addEventListener('click', () => {
        isComparisonModeActive = !isComparisonModeActive;
        body.classList.toggle('comparison-mode-active');
        if (isComparisonModeActive) {
            comparisonModeBtn.textContent = "[ End Custom Comparison ]";
            clearPinnedResults();
        } else {
            const selectedBoxes = document.querySelectorAll('.section-box.is-selected');
            if (selectedBoxes.length > 0 && confirm("Do you want to keep these comparison results pinned?")) {
                selectedBoxes.forEach(box => {
                    box.classList.remove('is-selected');
                    box.classList.add('is-pinned');
                });
                checkPinnedStatus();
            } else {
                selectedBoxes.forEach(box => box.classList.remove('is-selected'));
            }
            comparisonModeBtn.textContent = "[ Start Custom Comparison ]";
        }
        updateDisplays();
    };

    const checkPinnedStatus = () => {
        const anyPinned = document.querySelector('.section-box.is-pinned');
        clearPinnedBtn.classList.toggle('hidden', !anyPinned);
    };

    const handleAddSection = (e) => {
        pairCounter++;
        const newPairId = `p${pairCounter}`;
        const provider = e.target.dataset.provider;
        const columnBoxes = document.querySelectorAll(`.section-box[data-provider="${provider}"]`);
        const nextRow = columnBoxes.length + 1;
        createSection(provider, 'New Category', newPairId, nextRow);
        updateDisplays();
    };
    
    addSectionBtns.forEach(btn => btn.addEventListener('click', handleAddSection));
    
    const clearPinnedResults = () => {
        document.querySelectorAll('.section-box.is-pinned').forEach(box => {
            box.classList.remove('is-pinned');
            box.querySelector('.comparison-display-panel').innerHTML = '';
        });
        checkPinnedStatus();
    };
    clearPinnedBtn.addEventListener('click', clearPinnedResults);

    sectionsGrid.addEventListener('click', (e) => {
        if (e.target.matches('.clear-result-btn')) {
            const sectionBox = e.target.closest('.section-box');
            if (!sectionBox) return;
            const savingsDisplay = e.target.closest('.savings-display');
            if (savingsDisplay) {
                savingsDisplay.innerHTML = '';
            }
            const panel = e.target.closest('.comparison-display-panel');
            if (panel) {
                sectionBox.classList.remove('is-pinned');
                panel.innerHTML = '';
                checkPinnedStatus();
            }
        }
    });

    sectionsGrid.addEventListener('input', (e) => {
        if (e.target.matches('.value-input, .cost-checkbox, .section-title-input, textarea')) {
            updateDisplays();
        }
    });
    p1NameInput.addEventListener('input', updateDisplays);
    p2NameInput.addEventListener('input', updateDisplays);
    
    const saveState = () => {
        const data = {
            provider1Name: p1NameInput.value, provider2Name: p2NameInput.value,
            summaryNotes: summaryNotes.value, categories: []
        };
        const sectionBoxes = document.querySelectorAll('.section-box');
        const usedPairIds = new Set();
        sectionBoxes.forEach(box => usedPairIds.add(box.dataset.pairId));
        data.pairCounter = Math.max(0, ...Array.from(usedPairIds).map(id => parseInt(id.replace('p',''))));
        sectionBoxes.forEach(box => {
            const items = [];
            box.querySelectorAll('.custom-item-box').forEach(item => {
                items.push({
                    label: item.querySelector('.label-input').value, value: item.querySelector('.value-input').value, isCost: item.querySelector('.cost-checkbox').checked
                });
            });
            data.categories.push({
                provider: box.dataset.provider, gridRow: box.style.gridRow, pairId: box.dataset.pairId, title: box.querySelector('.section-title-input').value, notes: box.querySelector('textarea').value, items: items
            });
        });
        localStorage.setItem('tChartData', JSON.stringify(data));
        saveDataBtn.textContent = 'Saved!';
        setTimeout(() => { saveDataBtn.textContent = 'Save'; }, 1500);
    };

    // --- Data Persistence ---
    const loadState = () => {
        const dataString = localStorage.getItem('tChartData');
        if (!dataString) {
            // If there's no data at all, force a reset to the default template.
            init(true);
            return;
        }

        const data = JSON.parse(dataString);

        // *** THIS IS THE CRITICAL FIX ***
        // If the saved data is empty/corrupted, ignore it and load the default template.
        if (!data || !data.categories || data.categories.length === 0) {
            init(true);
            return;
        }

        // If we get here, the data is valid, so we load it.
        sectionsGrid.innerHTML = '';
        pairCounter = data.pairCounter || 0;
        p1NameInput.value = data.provider1Name || 'Provider 1';
        p2NameInput.value = data.provider2Name || 'Provider 2';
        summaryNotes.value = data.summaryNotes || '';
        data.categories.forEach(cat => {
            const newSection = createSection(cat.provider, cat.title, cat.pairId, cat.gridRow || 'auto', cat.notes);
            const itemsContainer = newSection.querySelector('.dynamic-items-container');
            cat.items.forEach(item => addCustomItem(itemsContainer, item));
        });
        updateDisplays();
    };
    
    const clearAllData = () => {
        if (confirm('Are you sure you want to clear all data? This will remove saved data and reset the board.')) {
            localStorage.removeItem('tChartData');
            init(true);
        }
    };
    saveDataBtn.addEventListener('click', saveState);
    loadDataBtn.addEventListener('click', loadState);
    clearDataBtn.addEventListener('click', clearAllData);
    
    // --- App Initialization ---
    const init = (isReset = false) => {
        // If it's not a forced reset, try to load saved data first.
        if (!isReset) {
            loadState();
            return;
        }

        // This block now only runs on a forced reset (isReset = true)
        // or when loadState() finds empty data.
        sectionsGrid.innerHTML = ''; 
        pairCounter = 0;
        p1NameInput.value = 'You'; 
        p2NameInput.value = 'TELUS';
        summaryNotes.value = '';
        
        const initialPairs = [
            { p1Title: 'Mobility', p2Title: 'Mobility' }, 
            { p1Title: 'Internet/TV', p2Title: 'Internet' },
            { p1Title: 'Streaming', p2Title: 'Streaming' }, 
            { p1Title: 'Security', p2Title: 'Security' }
        ];

        initialPairs.forEach((pair, index) => {
            pairCounter++;
            const row = index + 1;
            createSection(1, pair.p1Title, `p${pairCounter}`, row);
            createSection(2, pair.p2Title, `p${pairCounter}`, row);
        });
        
        updateDisplays();
    };
    
    // Start the application
    init();
});