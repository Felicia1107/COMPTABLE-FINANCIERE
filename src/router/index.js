import { createRouter, createWebHistory } from "vue-router";
import Login from "@/views/Login.vue";
import Balance from "@/views/Balance.vue";
import GrandLivre from "@/views/GrandLivre.vue";
import Import from "@/views/Import.vue";
import Dashbord from "@/views/Dashbord.vue";

const routes = [
  {
    path: "/",
    name: "Login",
    component: Login,
  },
  {
    path: "/balance",
    name: "Balance",
    component: Balance,
  },
  {
    path: "/grandLivre",
    name: "GrandLivre",
    component: GrandLivre,
  },
  {
    path: "/import",
    name: "Import",
    component: Import,
  },
{
  path:"/dashboard",
  name: "Dashboard",
  component:Dashbord,
}
];


const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
