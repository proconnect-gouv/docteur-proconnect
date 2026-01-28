#language: fr
Fonctionnalité: Connexion de user@yopmail.com

  Scénario: Connexion d'un utilisateur
    Etant donné que je navigue sur la page
    Alors je vois "Bienvenue chez le Dr. ProConnect !"
    Quand je clique sur le bouton ProConnect nommé "S'identifier avec un niveau de sécurité standard avec ProConnect"

    Quand je me connecte en tant que user@yopmail.com sur ProConnect Fédération
    Et je vois "Votre organisation de rattachement" sur ProConnect Identité
    Et je clique sur "Continuer" sur ProConnect Identité

    Et je vois "Votre compte" 
    Et je vois "Vous êtes User Jean" 
    Et je vois "Nom usuel : User" 
    Et je vois "Prénom : Jean" 
    Et je vois "Email : user@yopmail.com" 
    Et je vois "Type de connexion : pwd" 
    Et je vois "Classe de contexte d’authentification : https://proconnect.gouv.fr/assurance/consistency-checked" 
    Et je vois "SIRET : 18006701900430" 