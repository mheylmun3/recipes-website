function toggleMenu() {
    var x = document.getElementById("menuDropdown");
    if (x.style.display === "block") {
        x.style.display = "none";
    } else {
        x.style.display = "block";
    }
}

function toggleSubMenu() {
    var x = document.getElementById("recipesSubMenu");
    if (x.style.display === "block") {
        x.style.display = "none";
    } else {
        x.style.display = "block";
    }
}

function openTab(evt, tabName) {
    var i, tabcontent;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Show the current tab
    document.getElementById(tabName).style.display = "block";
    // Ensure menu is hidden
    document.getElementById("menuDropdown").style.display = "none";
}

function openSubTab(evt, subTabName) {
    var i, subtabcontent;

    // Get all elements with class="subtabcontent" and hide them
    subtabcontent = document.getElementsByClassName("subtabcontent");
    for (i = 0; i < subtabcontent.length; i++) {
        subtabcontent[i].style.display = "none";
    }

    // Show the current subtab
    document.getElementById(subTabName).style.display = "block";
    // Ensure submenu is hidden
    document.getElementById("recipesSubMenu").style.display = "none";
}

function toggleMenu() {
    var x = document.getElementById("menuDropdown");
    if (x.style.display === "block") {
        x.style.display = "none";
    } else {
        x.style.display = "block";
    }
}

function toggleSubMenu() {
    var x = document.getElementById("recipesSubMenu");
    if (x.style.display === "block") {
        x.style.display = "none";
    } else {
        x.style.display = "block";
    }
}

function openTab(evt, tabName) {
    var i, tabcontent;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Show the current tab
    document.getElementById(tabName).style.display = "block";
    // Ensure menu is hidden
    document.getElementById("menuDropdown").style.display = "none";
}

function openSubTab(evt, subTabName) {
    var i, subtabcontent;

    // Get all elements with class="subtabcontent" and hide them
    subtabcontent = document.getElementsByClassName("subtabcontent");
    for (i = 0; i < subtabcontent.length; i++) {
        subtabcontent[i].style.display = "none";
    }

    // Show the current subtab
    document.getElementById(subTabName).style.display = "block";
    // Ensure submenu is hidden
    document.getElementById("recipesSubMenu").style.display = "none";
}

function openModal() {
    document.getElementById("newRecipeModal").style.display = "block";
}

function closeModal() {
    document.getElementById("newRecipeModal").style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    var modal = document.getElementById("newRecipeModal");
    if (event.target == modal) {
        modal.style.display = "none";
    }
}
