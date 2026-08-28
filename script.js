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

let activeTenderSumId = null;
let selectedTenderStatusColor = "red";
let tempTenderSumFileUrl = "";
let tempTenderSumFileName = "";

let editingId = null;

function getStatusConfig(status) {
    switch (status) {
        case 'green':
            return { class: 'status-green', icon: '<i class="fa-solid fa-check"></i>' };
        case 'yellow':
            return { class: 'status-yellow', icon: '<i class="fa-solid fa-clock"></i>' };
        case 'partial':
            return { class: 'status-partial', icon: '<i class="fa-solid fa-circle-half-stroke"></i>' };
        default:
            return { class: 'status-red', icon: '<i class="fa-solid fa-xmark"></i>' };
    }
}

function loadDataFromFirebase() {
    const q = query(collection(db, "procurements"), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        dataList = [];
        snapshot.forEach((document) => {
            dataList.push({ id: document.id, ...document.data() });
        });
        renderData(dataList);
        updateOverallTotal(dataList); // <--- Жалпы сумманы эсептөөчү функция ушул жерге кошулат
    }, (error) => {
        console.error("Firebase катасы: ", error);
    });
}


function renderData(data = dataList) {
    const tbody = document.getElementById('tableBody');
    const mobileContainer = document.getElementById('mobileCardsContainer');
    
    if (tbody) tbody.innerHTML = '';
    if (mobileContainer) mobileContainer.innerHTML = '';

    if (data.length === 0) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: var(--text-light); padding: 20px;">Маалымат табылган жок.</td></tr>`;
        if (mobileContainer) mobileContainer.innerHTML = `<div style="text-align: center; color: var(--text-light); padding: 30px; font-size: 13px;">Маалымат табылган жок.</div>`;
        return;
    }

    data.forEach((item, index) => {
        let goppCfg = getStatusConfig(item.goppStatus);
        let goikCfg = getStatusConfig(item.goikStatus);
        let tenderSumCfg = getStatusConfig(item.tenderSumStatus);
        
        let pricesClass = item.pricesStatus ? 'prices-badge prices-green' : 'prices-badge';
        let pricesIcon = item.pricesStatus ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-file-arrow-up"></i>';
        let fileCount = item.files ? item.files.length : 0;
        
        let sumDisplayText = item.tenderSum ? Number(item.tenderSum).toLocaleString() + " сом" : "0 сом";
        
        // Төлөнгөн сумманы эсептөө же көрсөтүү
        let paidSumVal = 0;
        if (item.paymentsHistory && item.paymentsHistory.length > 0) {
            paidSumVal = item.paymentsHistory.reduce((acc, p) => acc + Number(p.amount || 0), 0);
        } else if (item.tenderSumStatus === 'green') {
            paidSumVal = Number(item.tenderSum || 0);
        } else if (item.tenderSumStatus === 'partial') {
            paidSumVal = Number(item.partialPaidSum || 0);
        }
        let formattedPaidSum = paidSumVal.toLocaleString() + " сом";

        let formattedGoppSum = item.gopp ? Number(item.gopp).toLocaleString() + " сом" : "0 сом";
        let formattedGoikSum = item.goik ? Number(item.goik).toLocaleString() + " сом" : "0 сом";

        // КОМПЬЮТЕР ҮЧҮН ТАБЛИЦА
        if (tbody) {
            tbody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong style="color: var(--primary);">${item.tender || ''}</strong></td>
                    <td>${item.org || ''}</td>
                    <td>${item.name || ''}</td>
                    <td>${sumDisplayText}</td>
                    <td>
                        <button class="status-badge ${tenderSumCfg.class}" onclick="window.openTenderSumModal('${item.id}')" style="width: 100%; justify-content: flex-start;">
                            ${tenderSumCfg.icon} <span>${formattedPaidSum}</span>
                        </button>
                    </td>
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
                            <i class="fa-solid fa-folder-open"></i> (${fileCount})
                        </a>
                    </td>
                    <td>
                        <button class="btn" style="background: #3b82f6; color: white; padding: 5px 10px; font-size: 12px; border-radius: 6px;" onclick="window.openEditModal('${item.id}')"><i class="fa-solid fa-pen"></i></button>
                    </td>
                </tr>
            `;
        }

        // ТЕЛЕФОН ҮЧҮН КАРТОЧКАЛАР
        if (mobileContainer) {
            mobileContainer.innerHTML += `
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.06);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                        <span style="font-weight: bold; color: #2563eb; font-size: 14px;"><i class="fa-solid fa-file-contract"></i> Тендер №: ${item.tender || 'Жок'}</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 11px; color: #64748b;"><i class="fa-regular fa-calendar"></i> ${item.date || ''}</span>
                            <button class="btn" style="background: #3b82f6; color: white; padding: 4px 8px; font-size: 11px; border-radius: 6px;" onclick="window.openEditModal('${item.id}')"><i class="fa-solid fa-pen"></i></button>
                        </div>
                    </div>
                    
                    <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 8px 10px; border-radius: 4px; margin-bottom: 8px;">
                        <div style="color: #1e40af; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px;">
                            <i class="fa-solid fa-building"></i> Мекеме:
                        </div>
                        <div style="font-weight: 700; color: #1e3a8a; font-size: 13px;">
                            ${item.org || 'Көрсөтүлгөн эмес'}
                        </div>
                    </div>

                    <div style="background: #f8fafc; border-left: 4px solid #64748b; padding: 8px 10px; border-radius: 4px; margin-bottom: 10px;">
                        <div style="color: #475569; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px;">
                            <i class="fa-solid fa-box-archive"></i> Лот аталышы:
                        </div>
                        <div style="color: #0f172a; font-weight: 600; font-size: 13px;">
                            ${item.name || 'Көрсөтүлгөн эмес'}
                        </div>
                    </div>

                    <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                        <div style="flex: 1; font-size: 12px; background: #f1f5f9; padding: 8px; border-radius: 6px;">
                            <span style="color: #64748b; font-size: 10px; display: block; margin-bottom: 2px;">Бюджет (Суммасы):</span>
                            <strong style="color: #0f172a;">${sumDisplayText}</strong>
                        </div>
                        <div style="flex: 1; font-size: 12px; background: #f1f5f9; padding: 8px; border-radius: 6px;">
                            <span style="color: #64748b; font-size: 10px; display: block; margin-bottom: 2px;">Төлөнгөн сумма:</span>
                            <button class="status-badge ${tenderSumCfg.class}" onclick="window.openTenderSumModal('${item.id}')" style="width: 100%; justify-content: center; padding: 4px;">
                                ${tenderSumCfg.icon} <span>${formattedPaidSum}</span>
                            </button>
                        </div>
                    </div>

                    <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                        <div style="flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 11px;">
                            <span style="color: #64748b; font-weight: bold;">ГОПП:</span>
                            <button class="status-badge ${goppCfg.class}" onclick="window.openStatusModal('${item.id}', 'gopp')" style="width: 100%; justify-content: center; padding: 6px;">
                                ${goppCfg.icon} ${formattedGoppSum}
                            </button>
                        </div>
                        <div style="flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 11px;">
                            <span style="color: #64748b; font-weight: bold;">ГОИК:</span>
                            <button class="status-badge ${goikCfg.class}" onclick="window.openStatusModal('${item.id}', 'goik')" style="width: 100%; justify-content: center; padding: 6px;">
                                ${goikCfg.icon} ${formattedGoikSum}
                            </button>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 10px; background: #f8fafc; padding: 6px 8px; border-radius: 6px;">
                        <span style="color: #64748b; font-weight: bold;">Таблица цен:</span>
                        <button class="${pricesClass}" onclick="window.triggerPriceFileSelect('${item.id}')">
                            ${pricesIcon} ${item.prices || 'Жок'}
                        </button>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 12px;">
                        <a href="#" class="download-link" onclick="window.openFilesModal('${item.id}'); return false;" style="font-weight: 600;">
                            <i class="fa-solid fa-folder-open"></i> Файлдар
                        </a>
                        <span style="color: #64748b; font-size: 11px;"><i class="fa-solid fa-paperclip"></i> ${fileCount} файл</span>
                    </div>
                </div>
            `;
        }
    });
}

function showLoading(text = "Файл жүктөлүүдө...") {
    document.getElementById('loadingText').innerText = text;
    document.getElementById('loadingModal').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingModal').classList.remove('active');
}

window.openTenderSumModal = function(id) {
    activeTenderSumId = id;
    tempTenderSumFileUrl = "";
    tempTenderSumFileName = "";
    document.getElementById('tenderSumFileNameText').innerText = "Файл тандоо";

    const item = dataList.find(d => d.id === id);
    if (item) {
        selectedTenderStatusColor = item.tenderSumStatus || 'red';
        document.getElementById('partialSumInput').value = item.partialPaidSum || '';
        updateTenderStatusButtonsUI();
    }

    document.getElementById('tenderSumStatusModal').classList.add('active');
};

window.setTenderStatusColor = function(color) {
    selectedTenderStatusColor = color;
    updateTenderStatusButtonsUI();
};

function updateTenderStatusButtonsUI() {
    const colors = ['red', 'yellow', 'green', 'partial'];
    colors.forEach(c => {
        const btn = document.getElementById(`tStatusBtn_${c}`);
        if (btn) {
            if (c === selectedTenderStatusColor) {
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

    const partialContainer = document.getElementById('partialSumContainer');
    if (selectedTenderStatusColor === 'partial') {
        partialContainer.style.display = "block";
    } else {
        partialContainer.style.display = "none";
    }
}

window.closeTenderSumModal = function() {
    document.getElementById('tenderSumStatusModal').classList.remove('active');
    document.getElementById('tenderSumStatusForm').reset();
};

window.triggerTenderSumFileSelect = function() {
    document.getElementById('tenderSumModalFileInput').click();
};

window.handleTenderSumFileSelected = async function(input) {
    if (input.files && input.files.length > 0) {
        const file = input.files[0];
        showLoading("Файл жүктөлүүдө...");
        const fileUrl = await uploadToCloudinary(file);
        hideLoading();

        if (fileUrl) {
            tempTenderSumFileUrl = fileUrl;
            tempTenderSumFileName = file.name;
            document.getElementById('tenderSumFileNameText').innerText = file.name;
        }
    }
    input.value = '';
};

window.saveTenderSumStatusData = async function() {
    if (activeTenderSumId !== null) {
        const item = dataList.find(d => d.id === activeTenderSumId);
        let updatedFiles = item.files ? [...item.files] : [];
        let paymentsHistory = item.paymentsHistory ? [...item.paymentsHistory] : [];

        let partialSumVal = document.getElementById('partialSumInput').value || "0";

        if (tempTenderSumFileUrl) {
            updatedFiles.push({ name: `[Төлөм] ${tempTenderSumFileName}`, url: tempTenderSumFileUrl });
        }

        let addedAmount = 0;
        if (selectedTenderStatusColor === 'green') {
            addedAmount = parseFloat(item.tenderSum || 0);
        } else if (selectedTenderStatusColor === 'partial') {
            addedAmount = parseFloat(partialSumVal || 0);
        }

        // Эгер төлөм суммасы болсо, аны мурункусун кошпой, жаңы маалымат катары жаңыртабыз 
        // Же тарыхка кошкуңуз келсе, акыркы кошулган сумманы гана жазабыз:
        if (addedAmount > 0) {
            // Эгер ар бир басканда кошулбай, акыркы сумма гана турсун десеңиз масивди жаңыдан түзөбүз:
            paymentsHistory = [{
                date: new Date().toLocaleDateString(),
                amount: addedAmount,
                status: selectedTenderStatusColor,
                fileUrl: tempTenderSumFileUrl || null,
                fileName: tempTenderSumFileName || null
            }];
        } else {
            paymentsHistory = [];
        }

        let updateData = {
            tenderSumStatus: selectedTenderStatusColor,
            partialPaidSum: selectedTenderStatusColor === 'partial' ? partialSumVal : "0",
            files: updatedFiles,
            paymentsHistory: paymentsHistory
        };

        try {
            showLoading("Сакталууда...");
            await updateDoc(doc(db, "procurements", activeTenderSumId), updateData);
            hideLoading();
            window.closeTenderSumModal();
        } catch (error) {
            console.error("Ката кетти: ", error);
            hideLoading();
            alert("Сактоо ишке ашкан жок!");
        }
    }
};


window.openEditModal = function(id) {
    editingId = id;
    const item = dataList.find(d => d.id === id);
    if (!item) return;

    document.getElementById('modalTitle').innerText = "Закупканы өзгөртүү";
    const tenderInput = document.getElementById('tenderNum');
    tenderInput.value = item.tender || '';
    
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
    
    setTimeout(() => {
        if (tenderInput) {
            tenderInput.focus();
            tenderInput.setAttribute('inputmode', 'numeric');
        }
    }, 100);
};

window.openModal = function() {
    editingId = null;
    document.getElementById('modalTitle').innerText = "Жаңы закупка кошуу";
    document.getElementById('procurementForm').reset();
    tempNewItemFileUrl = "";
    tempNewItemFileName = "";
    document.getElementById('selectedFileNameText').innerText = "Файл тандала элек";
    document.getElementById('addModal').classList.add('active');
    
    setTimeout(() => {
        const tenderInput = document.getElementById('tenderNum');
        if (tenderInput) {
            tenderInput.focus();
            tenderInput.setAttribute('inputmode', 'numeric');
        }
    }, 100);
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
    
    const gopp = document.getElementById('goppSum').value || "0";
    const goik = document.getElementById('goikSum').value || "0";
    const date = document.getElementById('openDate').value;

    if (!tender || !org || !name || !tenderSum || !date) {
        alert('Негизги талааларды толтуруңуз!');
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
                tenderSumStatus: 'red',
                partialPaidSum: "0",
                prices: pricesText,
                pricesStatus: pricesStatus,
                date,
                files: filesList,
                paymentsHistory: [],
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

    let resourceType = "auto";
    if (file.type === "application/pdf" || file.name.endsWith('.pdf')) {
        resourceType = "raw";
    }

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
            method: "POST",
            body: formData
        });
        const resData = await response.json();
        
        if (resData.secure_url) {
            let finalUrl = resData.secure_url;
            if (!finalUrl.includes("fl_attachment")) {
                finalUrl = finalUrl.replace("/upload/", "/upload/fl_attachment/");
            }
            return finalUrl;
        }
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
    const historyContainer = document.getElementById('paymentsHistoryContainer');
    const titleEl = document.getElementById('filesModalTitle');
    const modalEl = document.getElementById('filesListModal');
    
    let fileLen = item.files ? item.files.length : 0;
    if (titleEl) titleEl.innerText = `${item.tender} - Маалыматтар (${fileLen})`;
    
    if (container) {
        container.innerHTML = '';
        if (!item.files || item.files.length === 0) {
            container.innerHTML = `<p style="text-align: center; color: var(--text-light); font-size: 12px; padding: 10px;">Файлдар жок</p>`;
        } else {
            item.files.forEach((fileObj, fIndex) => {
                container.innerHTML += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 6px 10px; border-radius: 6px; font-size: 12px;">
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;"><i class="fa-solid fa-file-lines" style="color: var(--primary); margin-right: 5px;"></i> ${fileObj.name}</span>
                        <div style="display: flex; gap: 6px; flex-shrink: 0;">
                            <a href="${fileObj.url}" target="_blank" download class="btn" style="background: #22c55e; color: white; padding: 4px 8px; font-size: 11px; text-decoration: none;"><i class="fa-solid fa-download"></i></a>
                            <button class="btn" style="background: #ef4444; color: white; padding: 3px 8px; font-size: 11px;" onclick="window.confirmDeleteFile('${id}', ${fIndex})"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `;
            });
        }
    }

    if (historyContainer) {
        historyContainer.innerHTML = '';
        if (!item.paymentsHistory || item.paymentsHistory.length === 0) {
            historyContainer.innerHTML = `<p style="text-align: center; color: var(--text-light); font-size: 11px; padding: 8px;">Которулган суммалар жок</p>`;
        } else {
            item.paymentsHistory.forEach((pObj) => {
                let badgeColor = pObj.status === 'green' ? '#16a34a' : '#10b981';
                historyContainer.innerHTML += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid var(--border); padding: 6px 10px; border-radius: 6px; font-size: 11px;">
                        <div>
                            <span style="font-weight: bold; color: ${badgeColor};">${Number(pObj.amount).toLocaleString()} сом</span>
                            <span style="color: var(--text-light); margin-left: 6px;">(${pObj.date})</span>
                        </div>
                        ${pObj.fileUrl ? `<a href="${pObj.fileUrl}" target="_blank" class="download-link"><i class="fa-solid fa-paperclip"></i> Файл</a>` : ''}
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
                let updatedFiles = item && item.files ? [...item.files] : [];
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

function updateOverallTotal(data) {
    let total = 0;
    data.forEach(item => {
        total += Number(item.tenderSum || 0);
    });
    
    const totalElement = document.getElementById('totalTender');
    if (totalElement) {
        totalElement.textContent = total.toLocaleString() + ' сом';
    }
}

