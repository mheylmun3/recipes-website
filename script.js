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
    toggleMenu(); // Close the menu after selecting a tab
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
    toggleSubMenu(); // Close the submenu after selecting a subtab
}