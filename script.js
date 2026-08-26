import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    onSnapshot, 
    query, 
    orderBy, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBJL5WGMIh81TIUQaqZJr2BRcGn20J63qg",
    authDomain: "base-9b876.firebaseapp.com",
    projectId: "base-9b876",
    storageBucket: "base-9b876.firebasestorage.app",
    messagingSenderId: "73335844005",
    appId: "1:73335844005:web:83a27e8e152a340c4bb14c",
    measurementId: "G-RTE30GMPQE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CLOUD_NAME = "gyijk1gg";
const UPLOAD_PRESET = "my_preset";

let dataList = [];
let tempNewItemFileUrl = "";
let tempNewItemFileName = "";
let selectedPriceId = null;

let activeStatusId = null;
let activeStatusField = null;
let tempStatusFileUrl = "";
let tempStatusFileName = "";
let selectedStatusColor = "red";

let editingId = null;

function getStatusConfig(status) {
    switch (status) {
        case 'green':
            return { class: 'status-green', icon: '<i class="fa-solid fa-check"></i>' };
        case 'yellow':
            return { class: 'status-yellow', icon: '<i class="fa-solid fa-clock"></i>' };
        default:
            return { class: 'status-red', icon: '<i class="fa-solid fa-xmark"></i>' };
    }
}

function calculateTotals(data) {
    let totalTender = 0;
    let totalGopp = 0;
    let totalGoik = 0;

    data.forEach(item => {
        let tenderNum = parseFloat(String(item.tenderSum).replace(/[^0-9.-]+/g, "")) || 0;
        let goppNum = parseFloat(String(item.gopp).replace(/[^0-9.-]+/g, "")) || 0;
        let goikNum = parseFloat(String(item.goik).replace(/[^0-9.-]+/g, "")) || 0;
        
        totalTender += tenderNum;
        totalGopp += goppNum;
        totalGoik += goikNum;
    });

    const totalTenderEl = document.getElementById('totalTender');
    const totalGoppEl = document.getElementById('totalGopp');
    const totalGoikEl = document.getElementById('totalGoik');

    if (totalTenderEl) totalTenderEl.innerText = ` ${totalTender.toLocaleString()} сом`;
    if (totalGoppEl) totalGoppEl.innerText = `ГОПП: ${totalGopp.toLocaleString()} сом`;
    if (totalGoikEl) totalGoikEl.innerText = `ГОИК: ${totalGoik.toLocaleString()} сом`;
}

function loadDataFromFirebase() {
    // Коллекциянын аты 'procurements' экенин текшериңиз
    const q = query(collection(db, "procurements"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        dataList = [];
        snapshot.forEach((document) => {
            dataList.push({ id: document.id, ...document.data() });
        });
        renderData(dataList);
    }, (error) => {
        console.error("Firebase катасы: ", error);
        // Эгер индекс же башка ката болсо, индекс түзүү талап кылынышы мүмкүн, анда жөнөкөй query кылып көрөбүз:
        loadDataWithoutOrder();
    });
}

function loadDataWithoutOrder() {
    onSnapshot(collection(db, "procurements"), (snapshot) => {
        dataList = [];
        snapshot.forEach((document) => {
            dataList.push({ id: document.id, ...document.data() });
        });
        renderData(dataList);
    }, (err) => {
        console.error("Ката загрузка данных: ", err);
    });
}

function renderData(data = dataList) {
    const tbody = document.getElementById('tableBody');
    const mobileContainer = document.getElementById('mobileCardsContainer');
    
    if (tbody) tbody.innerHTML = '';
    if (mobileContainer) mobileContainer.innerHTML = '';

    if (data.length === 0) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-light); padding: 20px;">Маалымат табылган жок.</td></tr>`;
        if (mobileContainer) mobileContainer.innerHTML = `<div style="text-align: center; color: var(--text-light); padding: 30px; font-size: 13px;">Маалымат табылган жок.</div>`;
        calculateTotals([]);
        return;
    }

    data.forEach((item, index) => {
        let goppCfg = getStatusConfig(item.goppStatus);
        let goikCfg = getStatusConfig(item.goikStatus);
        
        let pricesClass = item.pricesStatus ? 'prices-badge prices-green' : 'prices-badge';
        let pricesIcon = item.pricesStatus ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-file-arrow-up"></i>';
        let fileCount = item.files ? item.files.length : 0;
        let formattedTenderSum = item.tenderSum ? Number(item.tenderSum).toLocaleString() + " сом" : "0 сом";
        let formattedGoppSum = item.gopp ? Number(item.gopp).toLocaleString() + " сом" : "0 сом";
        let formattedGoikSum = item.goik ? Number(item.goik).toLocaleString() + " сом" : "0 сом";

        if (tbody) {
            tbody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong style="color: var(--primary);">${item.tender || ''}</strong></td>
                    <td>${item.org || ''}</td>
                    <td>${item.name || ''}</td>
                    <td><strong style="color: var(--text-dark);">${formattedTenderSum}</strong></td>
                    <td>
                        <button class="status-badge ${goppCfg.class}" onclick="window.openStatusModal('${item.id}', 'gopp')">
                            ${goppCfg.icon} ${formattedGoppSum}
                        </button>
                    </td>
                    <td>
                        <button class="status-badge ${goikCfg.class}" onclick="window.openStatusModal('${item.id}', 'goik')">
                            ${goikCfg.icon} ${formattedGoikSum}
                        </button>
                    </td>
                    <td>
                        <button class="${pricesClass}" onclick="window.triggerPriceFileSelect('${item.id}')">
                            ${pricesIcon} ${item.prices || 'Жок'}
                        </button>
                    </td>
                    <td>${item.date || ''}</td>
                    <td>
                        <a href="#" class="download-link" onclick="window.openFilesModal('${item.id}'); return false;">
                            <i class="fa-solid fa-folder-open"></i> Файл (${fileCount})
                        </a>
                    </td>
                    <td>
                        <button class="btn" style="background: #3b82f6; color: white; padding: 5px 10px; font-size: 12px; border-radius: 6px;" onclick="window.openEditModal('${item.id}')"><i class="fa-solid fa-pen"></i></button>
                    </td>
                </tr>
            `;
        }

        if (mobileContainer) {
            mobileContainer.innerHTML += `
                <div class="m-card">
                    <div class="m-card-header">
                        <span class="m-tender-num"><i class="fa-solid fa-file-contract"></i> ${item.tender || ''}</span>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <span class="m-date"><i class="fa-regular fa-calendar"></i> ${item.date || ''}</span>
                            <button class="btn" style="background: #3b82f6; color: white; padding: 4px 8px; font-size: 12px; border-radius: 6px;" onclick="window.openEditModal('${item.id}')"><i class="fa-solid fa-pen"></i></button>
                        </div>
                    </div>
                    <div class="m-org"><i class="fa-regular fa-building"></i> ${item.org || ''}</div>
                    <div class="m-name">${item.name || ''}</div>
                    <div style="font-size: 13px; font-weight: bold; color: var(--text-dark); margin-bottom: 6px;">
                        Суммасы: ${formattedTenderSum}
                    </div>
                    <div class="m-sums">
                        <div class="m-sum-item">
                            <span>ГОПП:</span>
                            <button class="status-badge ${goppCfg.class}" onclick="window.openStatusModal('${item.id}', 'gopp')">
                                ${goppCfg.icon} ${formattedGoppSum}
                            </button>
                        </div>
                        <div class="m-sum-item">
                            <span>ГОИК:</span>
                            <button class="status-badge ${goikCfg.class}" onclick="window.openStatusModal('${item.id}', 'goik')">
                                ${goikCfg.icon} ${formattedGoikSum}
                            </button>
                        </div>
                    </div>
                    <div class="m-prices-info" style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                        <span>Таблица цен:</span>
                        <button class="${pricesClass}" onclick="window.triggerPriceFileSelect('${item.id}')">
                            ${pricesIcon} ${item.prices || 'Жок'}
                        </button>
                    </div>
                    <div class="m-footer">
                        <a href="#" class="download-link" onclick="window.openFilesModal('${item.id}'); return false;">
                            <i class="fa-solid fa-folder-open"></i> Файл (${fileCount})
                        </a>
                        <span style="color: var(--text-light); font-size: 10px;">${fileCount} файл</span>
                    </div>
                </div>
            `;
        }
    });

    calculateTotals(data);
}

function showLoading(text = "Файл жүктөлүүдө...") {
    document.getElementById('loadingText').innerText = text;
    document.getElementById('loadingModal').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingModal').classList.remove('active');
}

window.openEditModal = function(id) {
    editingId = id;
    const item = dataList.find(d => d.id === id);
    if (!item) return;

    document.getElementById('modalTitle').innerText = "Закупканы өзгөртүү";
    document.getElementById('tenderNum').value = item.tender || '';
    document.getElementById('orgName').value = item.org || '';
    document.getElementById('procName').value = item.name || '';
    document.getElementById('tenderSum').value = item.tenderSum || '';
    document.getElementById('goppSum').value = item.gopp || '';
    document.getElementById('goikSum').value = item.goik || '';
    document.getElementById('openDate').value = item.date || '';

    tempNewItemFileUrl = "";
    tempNewItemFileName = "";
    document.getElementById('selectedFileNameText').innerText = item.pricesStatus ? "Прайс файл тиркелген" : "Файл тандала элек";

    document.getElementById('addModal').classList.add('active');
};

window.openModal = function() {
    editingId = null;
    document.getElementById('modalTitle').innerText = "Жаңы закупка кошуу";
    document.getElementById('procurementForm').reset();
    tempNewItemFileUrl = "";
    tempNewItemFileName = "";
    document.getElementById('selectedFileNameText').innerText = "Файл тандала элек";
    document.getElementById('addModal').classList.add('active');
};

window.closeModal = function() {
    document.getElementById('addModal').classList.remove('active');
    document.getElementById('procurementForm').reset();
    editingId = null;
};

window.triggerNewItemFileSelect = function() {
    document.getElementById('newItemFileInput').click();
};

window.handleNewItemFileSelected = async function(input) {
    if (input.files && input.files.length > 0) {
        const file = input.files[0];
        showLoading("Прайс файл жүктөлүүдө...");
        const fileUrl = await uploadToCloudinary(file);
        hideLoading();

        if (fileUrl) {
            tempNewItemFileUrl = fileUrl;
            tempNewItemFileName = file.name;
            document.getElementById('selectedFileNameText').innerText = file.name;
        }
    }
    input.value = '';
};

window.saveProcurementData = async function() {
    const tender = document.getElementById('tenderNum').value;
    const org = document.getElementById('orgName').value;
    const name = document.getElementById('procName').value;
    const tenderSum = document.getElementById('tenderSum').value;
    const gopp = document.getElementById('goppSum').value;
    const goik = document.getElementById('goikSum').value;
    const date = document.getElementById('openDate').value;

    if (!tender || !org || !name || !tenderSum || !gopp || !goik || !date) {
        alert('Бардык талааларды толтуруңуз!');
        return;
    }

    try {
        showLoading("Сакталууда...");

        if (editingId) {
            let item = dataList.find(d => d.id === editingId);
            let filesList = item.files ? [...item.files] : [];
            let pricesStatus = item.pricesStatus;
            let pricesText = item.prices;

            if (tempNewItemFileUrl) {
                filesList.push({ name: `[Баа] ${tempNewItemFileName}`, url: tempNewItemFileUrl });
                pricesStatus = true;
                pricesText = "Тиркелген";
            }

            await updateDoc(doc(db, "procurements", editingId), {
                tender, org, name, tenderSum, gopp, goik, date,
                files: filesList,
                pricesStatus,
                prices: pricesText
            });
        } else {
            let filesList = [];
            let pricesStatus = false;
            let pricesText = "Жок";

            if (tempNewItemFileUrl) {
                filesList.push({ name: `[Баа] ${tempNewItemFileName}`, url: tempNewItemFileUrl });
                pricesStatus = true;
                pricesText = "Тиркелген";
            }

            const newItem = {
                tender, org, name, tenderSum, gopp,
                goppStatus: 'red',
                goik,
                goikStatus: 'red',
                prices: pricesText,
                pricesStatus: pricesStatus,
                date,
                files: filesList,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, "procurements"), newItem);
        }

        hideLoading();
        window.closeModal();
    } catch (error) {
        console.error("Ката кетти: ", error);
        hideLoading();
        alert("Сактоо ишке ашкан жок!");
    }
};

window.openStatusModal = function(id, field) {
    activeStatusId = id;
    activeStatusField = field;
    tempStatusFileUrl = "";
    tempStatusFileName = "";
    document.getElementById('statusFileNameText').innerText = "Файл тандоо";
    
    const item = dataList.find(d => d.id === id);
    if (item) {
        document.getElementById('statusModalTitle').innerText = `${field.toUpperCase()} статусун өзгөртүү`;
        selectedStatusColor = field === 'gopp' ? (item.goppStatus || 'red') : (item.goikStatus || 'red');
        updateStatusButtonsUI();
    }
    
    document.getElementById('statusSumModal').classList.add('active');
};

window.setStatusColor = function(color) {
    selectedStatusColor = color;
    updateStatusButtonsUI();
};

function updateStatusButtonsUI() {
    const colors = ['red', 'yellow', 'green'];
    colors.forEach(c => {
        const btn = document.getElementById(`statusBtn_${c}`);
        if (btn) {
            if (c === selectedStatusColor) {
                btn.style.opacity = "1";
                btn.style.border = "2px solid #000";
                btn.style.transform = "scale(1.05)";
            } else {
                btn.style.opacity = "0.5";
                btn.style.border = "1px solid transparent";
                btn.style.transform = "scale(1)";
            }
        }
    });
}

window.closeStatusSumModal = function() {
    document.getElementById('statusSumModal').classList.remove('active');
    document.getElementById('statusSumForm').reset();
};

window.triggerStatusFileSelect = function() {
    document.getElementById('statusModalFileInput').click();
};

window.handleStatusFileSelected = async function(input) {
    if (input.files && input.files.length > 0) {
        const file = input.files[0];
        showLoading("Файл жүктөлүүдө...");
        const fileUrl = await uploadToCloudinary(file);
        hideLoading();

        if (fileUrl) {
            tempStatusFileUrl = fileUrl;
            tempStatusFileName = file.name;
            document.getElementById('statusFileNameText').innerText = file.name;
        }
    }
    input.value = '';
};

window.saveStatusSumData = async function() {
    if (activeStatusId !== null && activeStatusField !== null) {
        const item = dataList.find(d => d.id === activeStatusId);
        let updatedFiles = item.files ? [...item.files] : [];
        
        if (tempStatusFileUrl) {
            updatedFiles.push({ name: `[${activeStatusField.toUpperCase()}] ${tempStatusFileName}`, url: tempStatusFileUrl });
        }

        let updateData = { files: updatedFiles };
        if (activeStatusField === 'gopp') {
            updateData.goppStatus = selectedStatusColor;
        }
        if (activeStatusField === 'goik') {
            updateData.goikStatus = selectedStatusColor;
        }

        try {
            showLoading("Сакталууда...");
            await updateDoc(doc(db, "procurements", activeStatusId), updateData);
            hideLoading();
            window.closeStatusSumModal();
        } catch (error) {
            console.error("Ката кетти: ", error);
            hideLoading();
            alert("Сактоо ишке ашкан жок!");
        }
    }
};

async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
            method: "POST",
            body: formData
        });
        const resData = await response.json();
        if (resData.secure_url) return resData.secure_url;
        throw new Error("Файл жүктөөдө ката кетти");
    } catch (error) {
        console.error(error);
        hideLoading();
        alert("Cloudinary'ге жүктөө ишке ашкан жок!");
        return null;
    }
}

window.openFilesModal = function(id) {
    const item = dataList.find(d => d.id === id);
    if (!item) return;

    const container = document.getElementById('filesContainer');
    const titleEl = document.getElementById('filesModalTitle');
    const modalEl = document.getElementById('filesListModal');
    
    let fileLen = item.files ? item.files.length : 0;
    if (titleEl) titleEl.innerText = `${item.tender} - Файлдар (${fileLen})`;
    
    if (container) {
        container.innerHTML = '';
        if (!item.files || item.files.length === 0) {
            container.innerHTML = `<p style="text-align: center; color: var(--text-light); font-size: 12px; padding: 15px;">Файлдар жок</p>`;
        } else {
            item.files.forEach((fileObj, fIndex) => {
                container.innerHTML += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 8px 10px; border-radius: 6px; font-size: 12px;">
                        <span><i class="fa-solid fa-file-lines" style="color: var(--primary); margin-right: 5px;"></i> ${fileObj.name}</span>
                        <div style="display: flex; gap: 6px;">
                            <a href="${fileObj.url}" target="_blank" class="btn" style="background: #22c55e; color: white; padding: 4px 8px; font-size: 11px; text-decoration: none;"><i class="fa-solid fa-download"></i></a>
                            <button class="btn" style="background: #ef4444; color: white; padding: 3px 8px; font-size: 11px;" onclick="window.confirmDeleteFile('${id}', ${fIndex})"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `;
            });
        }
    }
    if (modalEl) modalEl.classList.add('active');
};

window.closeFilesModal = function() {
    document.getElementById('filesListModal').classList.remove('active');
};

window.confirmDeleteFile = function(id, fileIndex) {
    const confirmModal = document.getElementById('confirmModal');
    const yesBtn = document.getElementById('confirmDeleteYesBtn');
    
    const newYesBtn = yesBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);

    newYesBtn.addEventListener('click', async () => {
        closeConfirmModal();
        await executeDeleteFile(id, fileIndex);
    });

    confirmModal.classList.add('active');
};

window.closeConfirmModal = function() {
    document.getElementById('confirmModal').classList.remove('active');
};

async function executeDeleteFile(id, fileIndex) {
    const item = dataList.find(d => d.id === id);
    if (!item || !item.files) return;

    let updatedFiles = [...item.files];
    let deletedFile = updatedFiles[fileIndex];
    updatedFiles.splice(fileIndex, 1);

    let updateData = { files: updatedFiles };
    
    if (deletedFile && deletedFile.name && deletedFile.name.startsWith('[Баа]')) {
        updateData.prices = "Жок";
        updateData.pricesStatus = false;
    }

    try {
        showLoading("Файл өчүрүлүүдө...");
        await updateDoc(doc(db, "procurements", id), updateData);
        hideLoading();
        window.openFilesModal(id);
    } catch (error) {
        console.error("Өчүрүүдө ката: ", error);
        hideLoading();
    }
}

window.triggerPriceFileSelect = function(id) {
    selectedPriceId = id;
    document.getElementById('priceFileInput').click();
};

window.handlePriceFileSelected = async function(input) {
    if (input.files && input.files.length > 0) {
        const file = input.files[0];
        if (selectedPriceId !== null) {
            showLoading("Прайс файл жүктөлүүдө...");
            const fileUrl = await uploadToCloudinary(file);
            hideLoading();

            if (fileUrl) {
                const item = dataList.find(d => d.id === selectedPriceId);
                let updatedFiles = item.files ? [...item.files] : [];
                updatedFiles.push({ name: `[Баа] ${file.name}`, url: fileUrl });

                try {
                    showLoading("Сакталууда...");
                    await updateDoc(doc(db, "procurements", selectedPriceId), {
                        prices: "Тиркелген",
                        pricesStatus: true,
                        files: updatedFiles
                    });
                    hideLoading();
                } catch (error) {
                    console.error("Ката: ", error);
                    hideLoading();
                }
            }
        }
    }
    input.value = '';
};

window.filterData = function() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    const queryStr = searchInput.value.toLowerCase();
    const filtered = dataList.filter(item => 
        (item.tender && item.tender.toLowerCase().includes(queryStr)) || 
        (item.org && item.org.toLowerCase().includes(queryStr)) || 
        (item.name && item.name.toLowerCase().includes(queryStr))
    );
    renderData(filtered);
};

window.onload = function() {
    loadDataFromFirebase();
};