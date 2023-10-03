import * as React from "react";

const DrawerMenu = () => {
  return (
    <div>
      <label
        for="menu-opener"
        tabindex="0"
        aria-haspopup="true"
        role="button"
        aria-controls="menu"
        className="OpenMenuButton"
        id="openmenu"
      >
        MENU
      </label>

      <input type="checkbox" data-menu id="menu-opener" hidden />
      <aside
        className="DrawerMenu"
        role="menu"
        id="menu"
        aria-labelledby="openmenu"
      >
        <nav className="Menu">
          <h2>Awesome CSS Menu</h2>
          <div role="menuitem" tabindex="-1">
            Menu Item 01
          </div>
          <div role="menuitem" tabindex="-1">
            Menu Item 02
          </div>
        </nav>
        <label for="menu-opener" className="MenuOverlay"></label>
      </aside>
    </div>
  );
};
export default DrawerMenu;
