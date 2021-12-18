$(document).ready(function () {
    $('#sidebarCollapse').on('click', function () {
        $('#sidebar').toggleClass('active');
    });
});

$(document).ready(function () {
    $('#table_id').DataTable();
});

$(document).ready(function () {
    $('#table_id').DataTable({
        "aLengthMenu": [[3, 10, 50, -1], [3, 10, 50, "All"]],
        "iDisplayLength": 3,
        "bDestroy": true
    });
});

$(document).ready(function () {
    $('#table_id2').DataTable({
        "aLengthMenu": [[7, 20, 50, -1], [7, 20, 50, "All"]],
        "iDisplayLength": 7,
        "bDestroy": true
    });
});

function fillData(id) {
    document.querySelector(".editForm").setAttribute("action", `/cashier/edit/${id}`);

    document.querySelector('.editModal input[name=fullname]').value = document.querySelector(`[id="${id}"] .fullname`).innerHTML;
    document.querySelector('.editModal input[name=email]').value = document.querySelector(`[id="${id}"] .email`).innerHTML;
    document.querySelector('.editModal input[name=phone]').value = document.querySelector(`[id="${id}"] .phone`).innerHTML;
    document.querySelector('.editModal textarea[name=address]').textContent = document.querySelector(`[id="${id}"] .address`).innerHTML;
    document.querySelector('.editModal input[name=username]').value = document.querySelector(`[id="${id}"] .username`).innerHTML;
    document.querySelector('.editModal input[name=password]').value = document.querySelector(`[id="${id}"] .password`).innerHTML;
}

function fillData2(id) {
    document.querySelector(".editForm2").setAttribute("action", `/product/edit/${id}`);

    document.querySelector('.editModal2 input[name=supplier]').value = document.querySelector(`[id="${id}"] .supplier`).innerHTML;
    document.querySelector('.editModal2 input[name=productCode]').value = document.querySelector(`[id="${id}"] .productCode`).innerHTML;
    document.querySelector('.editModal2 input[name=brand]').value = document.querySelector(`[id="${id}"] .brandName`).innerHTML;
    document.querySelector('.editModal2 input[name=productName]').value = document.querySelector(`[id="${id}"] .productName`).innerHTML;
    document.querySelector('.editModal2 select[name=unit]').value = document.querySelector(`[id="${id}"] .productUnit`).innerHTML;
    document.querySelector('.editModal2 input[name=quantity]').value = document.querySelector(`[id="${id}"] .quantity`).innerHTML;
    document.querySelector('.editModal2 input[name=cp]').value = document.querySelector(`[id="${id}"] .cost`).innerHTML;
    document.querySelector('.editModal2 input[name=srp]').value = document.querySelector(`[id="${id}"] .srp`).innerHTML;
}

new TomSelect("#select-state",{
    create: false,
});