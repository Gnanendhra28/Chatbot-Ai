import pytest
from app.core.security import UserPrincipal


class RBACPolicyEngine:
    """
    Role-Based Access Control (RBAC) Policy Evaluator.
    Determines access rights based on user role, department, and resource access levels.
    """

    ROLE_HIERARCHY = {
        "admin": 100,
        "manager": 50,
        "employee": 20,
        "viewer": 10,
        "guest": 0
    }

    ACTION_PERMISSIONS = {
        "admin_purge": ["admin"],
        "upload_document": ["admin", "manager", "employee"],
        "delete_document": ["admin", "manager"],
        "read_document": ["admin", "manager", "employee", "viewer"],
        "query_rag": ["admin", "manager", "employee", "viewer"]
    }

    @classmethod
    def is_action_allowed(cls, principal: UserPrincipal, action: str) -> bool:
        allowed_roles = cls.ACTION_PERMISSIONS.get(action, [])
        return principal.role in allowed_roles

    @classmethod
    def can_access_document(
        cls,
        principal: UserPrincipal,
        access_level: str,
        doc_department: str
    ) -> bool:
        if principal.role == "admin":
            return True

        if access_level == "public":
            return True

        if access_level == "internal" and principal.role in ["manager", "employee", "viewer"]:
            return True

        if access_level == "confidential":
            return principal.role in ["admin", "manager"]

        if access_level == "department":
            return principal.department.lower() == doc_department.lower()

        return False


# --- RBAC TEST SUITE ---

def test_admin_has_full_permissions():
    admin = UserPrincipal(user_id="u-admin", role="admin", department="Executive")
    assert RBACPolicyEngine.is_action_allowed(admin, "admin_purge") is True
    assert RBACPolicyEngine.is_action_allowed(admin, "delete_document") is True
    assert RBACPolicyEngine.is_action_allowed(admin, "upload_document") is True
    assert RBACPolicyEngine.can_access_document(admin, "confidential", "Finance") is True


def test_manager_permissions():
    manager = UserPrincipal(user_id="u-mgr", role="manager", department="Engineering")
    assert RBACPolicyEngine.is_action_allowed(manager, "admin_purge") is False
    assert RBACPolicyEngine.is_action_allowed(manager, "delete_document") is True
    assert RBACPolicyEngine.is_action_allowed(manager, "upload_document") is True
    assert RBACPolicyEngine.can_access_document(manager, "confidential", "Engineering") is True


def test_employee_permissions():
    emp = UserPrincipal(user_id="u-emp", role="employee", department="Engineering")
    assert RBACPolicyEngine.is_action_allowed(emp, "delete_document") is False
    assert RBACPolicyEngine.is_action_allowed(emp, "upload_document") is True
    assert RBACPolicyEngine.is_action_allowed(emp, "read_document") is True
    assert RBACPolicyEngine.can_access_document(emp, "confidential", "Engineering") is False
    assert RBACPolicyEngine.can_access_document(emp, "internal", "Engineering") is True


def test_viewer_permissions():
    viewer = UserPrincipal(user_id="u-view", role="viewer", department="General")
    assert RBACPolicyEngine.is_action_allowed(viewer, "upload_document") is False
    assert RBACPolicyEngine.is_action_allowed(viewer, "delete_document") is False
    assert RBACPolicyEngine.is_action_allowed(viewer, "query_rag") is True
    assert RBACPolicyEngine.can_access_document(viewer, "internal", "General") is True
    assert RBACPolicyEngine.can_access_document(viewer, "confidential", "General") is False


def test_guest_permissions():
    guest = UserPrincipal(user_id="u-guest", role="guest", department="External")
    assert RBACPolicyEngine.is_action_allowed(guest, "upload_document") is False
    assert RBACPolicyEngine.is_action_allowed(guest, "query_rag") is False
    assert RBACPolicyEngine.can_access_document(guest, "public", "General") is True
    assert RBACPolicyEngine.can_access_document(guest, "internal", "General") is False


def test_department_level_document_access():
    hr_emp = UserPrincipal(user_id="u-hr", role="employee", department="HR")
    eng_emp = UserPrincipal(user_id="u-eng", role="employee", department="Engineering")

    # HR department doc
    assert RBACPolicyEngine.can_access_document(hr_emp, "department", "HR") is True
    assert RBACPolicyEngine.can_access_document(eng_emp, "department", "HR") is False
