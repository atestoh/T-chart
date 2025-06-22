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
    // NEW: Summary elements
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
                    <button class="calculate-savings-btn" title="Compare Category">CC</button> <!-- CHANGED: Text to CC -->
                    <span class="savings-display"></span>
                </div>
                <div class="comparison-display-panel"></div>
            </div>
            <div class="notes-section"><textarea placeholder="Notes...">${notes}</textarea></div>
        `;
        // REWORKED: Delete handler now removes only the single element
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
        const monthlyDiff = p2Total - p1Total;
        p1TotalSpan.textContent = `$${p1Total.toFixed(2)}`;
        p2TotalSpan.textContent = `$${p2Total.toFixed(2)}`;
        monthlyDiffSpan.textContent = `$${monthlyDiff.toFixed(2)}`;
        monthlyDiffSpan.className = 'summary-total highlight colspan-2';
        if (monthlyDiff < 0) monthlyDiffSpan.classList.add('negative');
        yearlyDiffSpan.textContent = `$${(monthlyDiff * 12).toFixed(2)}`;
        yearlyDiffSpan.className = 'summary-total colspan-2';
        if (monthlyDiff < 0) yearlyDiffSpan.classList.add('negative');
        threeYearDiffSpan.textContent = `$${(monthlyDiff * 36).toFixed(2)}`;
        threeYearDiffSpan.className = 'summary-total colspan-2';
        if (monthlyDiff < 0) threeYearDiffSpan.classList.add('negative');

        // NEW: Toggle attention-grabbing class if Provider 2 (TELUS) is cheaper
        summaryBox.classList.toggle('has-savings', monthlyDiff < 0);
    };
    
    const updateComparisonPanels = (p1GroupTotal, p2GroupTotal) => {
        const p1Name = p1NameInput.value || 'Provider 1';
        const p2Name = p2NameInput.value || 'Provider 2';
        document.querySelectorAll('.section-box.is-selected, .section-box.is-pinned').forEach(box => {
            const panel = box.querySelector('.comparison-display-panel');
            const diff = p2GroupTotal - p1GroupTotal;
            let resultHTML = '';
            if (diff > 0) { resultHTML = `<div class="result savings-positive">Result: ${p1Name} is $${diff.toFixed(2)} cheaper</div>`; }
            else if (diff < 0) { resultHTML = `<div class="result savings-positive">Result: ${p2Name} is $${Math.abs(diff).toFixed(2)} cheaper</div>`; }
            else { resultHTML = `<div class="result">Result: Costs are equal</div>`; }
            panel.innerHTML = `
                <div><strong>${p1Name} Group:</strong> $${p1GroupTotal.toFixed(2)}</div>
                <div><strong>${p2Name} Group:</strong> $${p2GroupTotal.toFixed(2)}</div>
                ${resultHTML}
            `;
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
        const diff = cost1 - cost2; // Use cost2 directly, getSectionCost handles null target
        const display = sourceSection.querySelector('.savings-display');
        display.classList.remove('savings-positive', 'savings-negative');
        if (diff > 0) { display.textContent = `$${diff.toFixed(2)} more expensive`; display.classList.add('savings-negative'); }
        else if (diff < 0) { display.textContent = `$${Math.abs(diff).toFixed(2)} cheaper`; display.classList.add('savings-positive'); }
        else { display.textContent = 'Equal cost'; }
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
                clearPinnedBtn.classList.remove('hidden');
            } else {
                selectedBoxes.forEach(box => box.classList.remove('is-selected'));
            }
            comparisonModeBtn.textContent = "[ Start Custom Comparison ]";
        }
        updateDisplays();
    });

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
        clearPinnedBtn.classList.add('hidden');
    };
    clearPinnedBtn.addEventListener('click', clearPinnedResults);

    sectionsGrid.addEventListener('input', (e) => {
        if (e.target.matches('.value-input, .cost-checkbox, .section-title-input, textarea')) {
            updateDisplays();
        }
    });
    p1NameInput.addEventListener('input', updateDisplays);
    p2NameInput.addEventListener('input', updateDisplays);
    
    const saveState = () => {
        const data = {
            provider1Name: p1NameInput.value,
            provider2Name: p2NameInput.value,
            summaryNotes: summaryNotes.value, // NEW: Save summary notes
            categories: []
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

    const loadState = () => {
        const dataString = localStorage.getItem('tChartData');
        if (!dataString) { alert('No saved data found.'); return; }
        const data = JSON.parse(dataString);
        sectionsGrid.innerHTML = '';
        pairCounter = data.pairCounter || 0;
        p1NameInput.value = data.provider1Name || 'Provider 1';
        p2NameInput.value = data.provider2Name || 'Provider 2';
        summaryNotes.value = data.summaryNotes || ''; // NEW: Load summary notes
        data.categories.forEach(cat => {
            const newSection = createSection(cat.provider, cat.title, cat.pairId, cat.gridRow || 'auto', cat.notes);
            const itemsContainer = newSection.querySelector('.dynamic-items-container');
            cat.items.forEach(item => addCustomItem(itemsContainer, item));
        });
        updateDisplays();
        alert('Data loaded successfully!');
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
    
    const init = (isReset = false) => {
        if (!isReset && localStorage.getItem('tChartData')) {
            loadState();
            return;
        }
        sectionsGrid.innerHTML = ''; 
        pairCounter = 0;
        p1NameInput.value = 'You'; 
        p2NameInput.value = 'TELUS';
        summaryNotes.value = '';

        // NEW: Added back streaming and security
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
    
    init();
});